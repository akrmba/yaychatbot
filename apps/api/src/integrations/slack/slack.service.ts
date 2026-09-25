import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationConfigService } from '../shared/integration-config.service';

interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(
    private config: ConfigService,
    private integrationConfig: IntegrationConfigService,
  ) {}

  getOAuthUrl(organizationId: string): string {
    const clientId = this.config.getOrThrow<string>('SLACK_CLIENT_ID');
    const redirectUri = this.config.getOrThrow<string>('SLACK_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ organizationId })).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'incoming-webhook',
      redirect_uri: redirectUri,
      state,
    });
    return `https://slack.com/oauth/v2/authorize?${params}`;
  }

  async handleCallback(code: string, organizationId: string): Promise<void> {
    const clientId = this.config.getOrThrow<string>('SLACK_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('SLACK_CLIENT_SECRET');
    const redirectUri = this.config.getOrThrow<string>('SLACK_REDIRECT_URI');

    const res = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = (await res.json()) as {
      ok: boolean;
      incoming_webhook?: { url: string; channel: string; channel_id: string };
      access_token?: string;
      error?: string;
    };

    if (!data.ok) throw new Error(`Slack OAuth failed: ${data.error}`);

    await this.integrationConfig.upsert(organizationId, 'slack', {
      accessToken: data.access_token ?? data.incoming_webhook!.url,
      metadata: {
        webhookUrl: data.incoming_webhook?.url,
        channel: data.incoming_webhook?.channel,
        channelId: data.incoming_webhook?.channel_id,
      },
    });
  }

  async sendQualifiedLeadNotification(
    organizationId: string,
    lead: {
      name?: string;
      email?: string;
      company?: string;
      score: number;
      qualificationData?: Record<string, unknown>;
    },
  ): Promise<void> {
    const tokens = await this.integrationConfig.getTokens(organizationId, 'slack');
    if (!tokens) return;

    const webhookUrl = (tokens.metadata as Record<string, string>)?.webhookUrl;
    if (!webhookUrl) return;

    const scoreEmoji = lead.score >= 80 ? '🔥' : lead.score >= 60 ? '⭐' : '📋';
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${scoreEmoji} New Qualified Lead`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:*\n${lead.name ?? 'Unknown'}` },
          { type: 'mrkdwn', text: `*Email:*\n${lead.email ?? 'N/A'}` },
          { type: 'mrkdwn', text: `*Company:*\n${lead.company ?? 'N/A'}` },
          { type: 'mrkdwn', text: `*Score:*\n${lead.score}/100` },
        ],
      },
    ];

    if (lead.qualificationData && Object.keys(lead.qualificationData).length > 0) {
      const qualLines = Object.entries(lead.qualificationData)
        .map(([k, v]) => `• *${k}:* ${String(v)}`)
        .join('\n');
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Qualification Data:*\n${qualLines}` },
      });
    }

    blocks.push({ type: 'divider' });

    await this.post(webhookUrl, { blocks });
  }

  async sendMeetingBookedNotification(
    organizationId: string,
    lead: {
      name?: string;
      email?: string;
      company?: string;
      meetingUrl?: string;
    },
  ): Promise<void> {
    const tokens = await this.integrationConfig.getTokens(organizationId, 'slack');
    if (!tokens) return;

    const webhookUrl = (tokens.metadata as Record<string, string>)?.webhookUrl;
    if (!webhookUrl) return;

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📅 Meeting Booked', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:*\n${lead.name ?? 'Unknown'}` },
          { type: 'mrkdwn', text: `*Email:*\n${lead.email ?? 'N/A'}` },
          { type: 'mrkdwn', text: `*Company:*\n${lead.company ?? 'N/A'}` },
        ],
      },
    ];

    if (lead.meetingUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Meeting', emoji: true },
            url: lead.meetingUrl,
            style: 'primary',
          },
        ],
      });
    }

    await this.post(webhookUrl, { blocks });
  }

  private async post(webhookUrl: string, payload: unknown): Promise<void> {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      this.logger.warn(`Slack webhook post failed: ${res.status}`);
    }
  }
}
