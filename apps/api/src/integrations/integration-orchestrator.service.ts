import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CalendlyService } from './calendly/calendly.service';
import { HubspotService } from './hubspot/hubspot.service';
import { SlackService } from './slack/slack.service';
import { ResendService } from './resend/resend.service';
import { OutboundWebhookService } from './webhooks/outbound-webhook.service';

/**
 * Central orchestrator called by LeadsService / ConversationsService
 * when a lead is qualified or a meeting is booked.
 */
@Injectable()
export class IntegrationOrchestratorService {
  private readonly logger = new Logger(IntegrationOrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private calendly: CalendlyService,
    private hubspot: HubspotService,
    private slack: SlackService,
    private resend: ResendService,
    private webhooks: OutboundWebhookService,
  ) {}

  /** Call this when a lead is qualified (score threshold met) */
  async onLeadQualified(organizationId: string, leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { users: { where: { role: 'OWNER' }, take: 1 } },
    });
    if (!org) return;

    const leadData = {
      name: lead.name ?? undefined,
      email: lead.email ?? undefined,
      company: lead.company ?? undefined,
      score: lead.score,
      qualificationData: (lead.qualificationData as Record<string, unknown>) ?? {},
    };

    // Run all integrations concurrently — failures are isolated
    await Promise.allSettled([
      this.hubspot.syncLead(organizationId, leadId).catch((e) =>
        this.logger.warn(`HubSpot sync failed: ${String(e)}`),
      ),
      this.slack.sendQualifiedLeadNotification(organizationId, leadData).catch((e) =>
        this.logger.warn(`Slack notify failed: ${String(e)}`),
      ),
      org.users[0]?.email
        ? this.resend
            .sendNewQualifiedLeadEmail(org.users[0].email, leadData)
            .catch((e) => this.logger.warn(`Resend owner email failed: ${String(e)}`))
        : Promise.resolve(),
      lead.email
        ? this.resend
            .sendProspectConfirmationEmail(lead.email, {
              prospectName: lead.name ?? undefined,
              organizationName: org.name,
            })
            .catch((e) => this.logger.warn(`Resend prospect email failed: ${String(e)}`))
        : Promise.resolve(),
      this.webhooks
        .dispatch(organizationId, 'lead.qualified', {
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          company: lead.company,
          score: lead.score,
          qualificationData: lead.qualificationData,
        })
        .catch((e) => this.logger.warn(`Webhook dispatch failed: ${String(e)}`)),
    ]);
  }

  /** Call this when a meeting is booked (Calendly webhook fires) */
  async onMeetingBooked(organizationId: string, leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return;

    const leadData = {
      name: lead.name ?? undefined,
      email: lead.email ?? undefined,
      company: lead.company ?? undefined,
      meetingUrl: lead.meetingUrl ?? undefined,
    };

    await Promise.allSettled([
      this.slack.sendMeetingBookedNotification(organizationId, leadData).catch((e) =>
        this.logger.warn(`Slack meeting notify failed: ${String(e)}`),
      ),
      lead.email && lead.meetingUrl
        ? this.resend
            .sendMeetingConfirmationEmail(lead.email, {
              prospectName: lead.name ?? undefined,
              organizationName: org.name,
              meetingUrl: lead.meetingUrl,
            })
            .catch((e) => this.logger.warn(`Resend meeting email failed: ${String(e)}`))
        : Promise.resolve(),
      this.webhooks
        .dispatch(organizationId, 'meeting.booked', {
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          meetingUrl: lead.meetingUrl,
        })
        .catch((e) => this.logger.warn(`Webhook dispatch failed: ${String(e)}`)),
    ]);
  }
}
