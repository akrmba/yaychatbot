import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Plan } from "@prisma/client";
import Stripe from "stripe";
import { PrismaService } from "../../prisma/prisma.service";
import { PLAN_CONFIGS, TRIAL_DAYS } from "./billing.constants";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow<string>("STRIPE_SECRET_KEY"), {
      apiVersion: "2024-06-20",
    });
  }

  // ─── Subscription ────────────────────────────────────────────────────────────

  async createSubscription(organizationId: string, plan: Plan): Promise<{ clientSecret: string | null; subscriptionId: string }> {
    if (plan === Plan.FREE) {
      throw new BadRequestException("Cannot create a Stripe subscription for the FREE plan");
    }

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });

    const planConfig = PLAN_CONFIGS[plan];

    // Ensure Stripe customer exists
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        metadata: { organizationId, slug: org.slug },
        name: org.name,
      });
      customerId = customer.id;
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: customerId },
      });
    }

    const trialEnd = Math.floor(Date.now() / 1000) + TRIAL_DAYS * 86400;

    const items: Stripe.SubscriptionCreateParams.Item[] = [
      { price: planConfig.stripePriceId },
    ];
    if (planConfig.stripeMeteredPriceId) {
      items.push({ price: planConfig.stripeMeteredPriceId });
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items,
      trial_end: trialEnd,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { organizationId, plan },
    });

    // Find the metered sub item id if present
    const meteredItem = subscription.items.data.find(
      (i) => i.price.id === planConfig.stripeMeteredPriceId,
    );

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeSubscriptionId: subscription.id,
        stripeMeteredSubItemId: meteredItem?.id ?? null,
        trialEndsAt: new Date(trialEnd * 1000),
        plan,
      },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? null,
    };
  }

  // ─── Usage Reporting (daily cron) ────────────────────────────────────────────

  async reportUsageForAllOrgs(): Promise<void> {
    const month = this.currentMonth();

    const orgs = await this.prisma.organization.findMany({
      where: {
        stripeMeteredSubItemId: { not: null },
        plan: { not: Plan.FREE },
      },
      select: {
        id: true,
        stripeMeteredSubItemId: true,
        usageRecords: {
          where: { month },
          select: { conversationCount: true },
        },
      },
    });

    await Promise.allSettled(
      orgs.map(async (org) => {
        const count = org.usageRecords[0]?.conversationCount ?? 0;
        if (count === 0 || !org.stripeMeteredSubItemId) return;

        try {
          await this.stripe.subscriptionItems.createUsageRecord(
            org.stripeMeteredSubItemId,
            {
              quantity: count,
              timestamp: Math.floor(Date.now() / 1000),
              action: "set",
            },
          );
          this.logger.log(`Reported ${count} conversations for org ${org.id}`);
        } catch (err) {
          this.logger.error(`Failed to report usage for org ${org.id}`, err);
        }
      }),
    );
  }

  // ─── Overage Enforcement ─────────────────────────────────────────────────────

  async checkAndFlagOverage(organizationId: string): Promise<{
    isOverLimit: boolean;
    isCostCapReached: boolean;
  }> {
    const month = this.currentMonth();
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { usageRecords: { where: { month } } },
    });

    const planConfig = PLAN_CONFIGS[org.plan];
    const usage = org.usageRecords[0];
    const conversationCount = usage?.conversationCount ?? 0;
    const isOverLimit = conversationCount >= planConfig.conversationLimit;

    // Cost-cap check
    const currentSpendCents = usage ? Math.round(usage.cost * 100) : 0;
    const isCostCapReached =
      org.costCapCents != null && currentSpendCents >= org.costCapCents;

    if (isOverLimit && !org.overageFlagged) {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { overageFlagged: true },
      });
    }

    return { isOverLimit, isCostCapReached };
  }

  // ─── Billing Portal ───────────────────────────────────────────────────────────

  async createBillingPortalSession(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });

    if (!org.stripeCustomerId) {
      throw new BadRequestException("No Stripe customer found for this organization");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${this.config.getOrThrow<string>("DASHBOARD_URL")}/settings/billing`,
    });

    return session.url;
  }

  // ─── Usage Summary ────────────────────────────────────────────────────────────

  async getUsageSummary(organizationId: string) {
    const month = this.currentMonth();
    const [org, widgetCount, usage] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
      this.prisma.widget.count({ where: { organizationId, isActive: true } }),
      this.prisma.usageRecord.findUnique({
        where: { organizationId_month: { organizationId, month } },
      }),
    ]);

    const planConfig = PLAN_CONFIGS[org.plan];
    const conversationCount = usage?.conversationCount ?? 0;
    const usagePercent = Math.min(
      100,
      Math.round((conversationCount / planConfig.conversationLimit) * 100),
    );

    return {
      plan: org.plan,
      conversationCount,
      conversationLimit: planConfig.conversationLimit,
      usagePercent,
      isOverLimit: conversationCount >= planConfig.conversationLimit,
      widgetCount,
      widgetLimit: planConfig.widgetLimit,
      costCapCents: org.costCapCents ?? null,
      currentSpendCents: usage ? Math.round(usage.cost * 100) : 0,
      trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
      month,
    };
  }

  // ─── Invoice History ──────────────────────────────────────────────────────────

  async getInvoices(organizationId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });

    if (!org.stripeCustomerId) return [];

    const invoices = await this.stripe.invoices.list({
      customer: org.stripeCustomerId,
      limit: 24,
    });

    return invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      date: new Date(inv.created * 1000).toISOString(),
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      pdfUrl: inv.invoice_pdf,
    }));
  }

  // ─── Cost Cap ─────────────────────────────────────────────────────────────────

  async updateCostCap(organizationId: string, costCapCents: number): Promise<void> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { costCapCents: costCapCents === 0 ? null : costCapCents },
    });
  }

  // ─── Webhook Handlers ─────────────────────────────────────────────────────────

  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan: Plan.FREE,
        stripeSubscriptionId: null,
        stripeMeteredSubItemId: null,
        trialEndsAt: null,
        overageFlagged: false,
      },
    });
    this.logger.log(`Org ${organizationId} downgraded to FREE (subscription deleted)`);
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    const planStr = subscription.metadata?.plan as Plan | undefined;
    if (!planStr || !Object.values(Plan).includes(planStr)) return;

    const planConfig = PLAN_CONFIGS[planStr];
    const meteredItem = subscription.items.data.find(
      (i) => i.price.id === planConfig.stripeMeteredPriceId,
    );

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan: planStr,
        stripeMeteredSubItemId: meteredItem?.id ?? null,
        overageFlagged: false,
      },
    });
    this.logger.log(`Org ${organizationId} plan updated to ${planStr}`);
  }

  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
      include: { users: { where: { role: "OWNER" }, select: { email: true, name: true } } },
    });

    if (!org) return;

    this.logger.warn(`Payment failed for org ${org.id}, invoice ${invoice.id}`);
    // Dunning email is sent via the webhook controller using Resend
  }

  // ─── Stripe Webhook Verification ─────────────────────────────────────────────

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.getOrThrow<string>("STRIPE_WEBHOOK_SECRET");
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  async getOrgOwnerEmail(organizationId: string): Promise<{ email: string; name: string } | null> {
    const owner = await this.prisma.user.findFirst({
      where: { organizationId, role: "OWNER" },
      select: { email: true, name: true },
    });
    return owner;
  }
}
