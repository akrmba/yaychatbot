import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiExcludeEndpoint } from "@nestjs/swagger";
import { Request } from "express";
import Stripe from "stripe";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { Public } from "../../common/decorators/public.decorator";
import { BillingService } from "./billing.service";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("Webhooks")
@Controller("webhooks")
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private readonly resend: Resend;
  private readonly emailFrom: string;

  constructor(
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.resend = new Resend(config.getOrThrow<string>("RESEND_API_KEY"));
    this.emailFrom = config.getOrThrow<string>("EMAIL_FROM");
  }

  @Public()
  @Post("stripe")
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers("stripe-signature") signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }

    let event: Stripe.Event;
    try {
      event = this.billingService.constructWebhookEvent(
        req.body as Buffer,
        signature,
      );
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException("Invalid webhook signature");
    }

    this.logger.log(`Stripe event: ${event.type} [${event.id}]`);

    switch (event.type) {
      case "customer.subscription.deleted":
        await this.billingService.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.updated":
        await this.billingService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    await this.billingService.handlePaymentFailed(invoice);

    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
      include: {
        users: {
          where: { role: "OWNER" },
          select: { email: true, name: true },
          take: 1,
        },
      },
    });

    const owner = org?.users[0];
    if (!owner) return;

    const attemptCount = invoice.attempt_count ?? 1;
    const amountDue = ((invoice.amount_due ?? 0) / 100).toFixed(2);
    const currency = (invoice.currency ?? "usd").toUpperCase();
    const portalUrl = `${this.config.getOrThrow<string>("DASHBOARD_URL")}/settings/billing`;

    const subject =
      attemptCount === 1
        ? "Action required: Payment failed for YayChatbot"
        : `Reminder: Payment still failing for YayChatbot (attempt ${attemptCount})`;

    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to: owner.email,
        subject,
        html: this.buildDunningEmail({ name: owner.name, amountDue, currency, attemptCount, portalUrl }),
      });
      this.logger.log(`Dunning email sent to ${owner.email} (attempt ${attemptCount})`);
    } catch (err) {
      this.logger.error("Failed to send dunning email", err);
    }
  }

  private buildDunningEmail(params: {
    name: string;
    amountDue: string;
    currency: string;
    attemptCount: number;
    portalUrl: string;
  }): string {
    const { name, amountDue, currency, attemptCount, portalUrl } = params;
    return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#111">Payment failed</h2>
        <p>Hi ${name},</p>
        <p>We were unable to process your payment of <strong>${currency} ${amountDue}</strong> for YayChatbot${attemptCount > 1 ? ` (attempt ${attemptCount})` : ""}.</p>
        <p>To keep your account active, please update your payment method:</p>
        <p style="margin:24px 0">
          <a href="${portalUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
            Update payment method
          </a>
        </p>
        <p style="color:#666;font-size:13px">If you have questions, reply to this email and we'll help you out.</p>
        <p style="color:#666;font-size:13px">— The YayChatbot team</p>
      </div>
    `;
  }
}
