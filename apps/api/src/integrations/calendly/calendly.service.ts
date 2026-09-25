import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationConfigService } from '../shared/integration-config.service';

export interface CalendlySlot {
  startTime: string;
  endTime: string;
  schedulingUrl: string;
}

@Injectable()
export class CalendlyService {
  private readonly logger = new Logger(CalendlyService.name);
  private readonly baseUrl = 'https://api.calendly.com';

  constructor(
    private config: ConfigService,
    private integrationConfig: IntegrationConfigService,
  ) {}

  getOAuthUrl(organizationId: string): string {
    const clientId = this.config.getOrThrow<string>('CALENDLY_CLIENT_ID');
    const redirectUri = this.config.getOrThrow<string>('CALENDLY_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ organizationId })).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });
    return `https://auth.calendly.com/oauth/authorize?${params}`;
  }

  async handleCallback(code: string, organizationId: string): Promise<void> {
    const clientId = this.config.getOrThrow<string>('CALENDLY_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('CALENDLY_CLIENT_SECRET');
    const redirectUri = this.config.getOrThrow<string>('CALENDLY_REDIRECT_URI');

    const res = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) throw new Error(`Calendly token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      owner: string;
    };

    await this.integrationConfig.upsert(organizationId, 'calendly', {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      metadata: { owner: data.owner },
    });

    await this.registerWebhook(organizationId, data.access_token, data.owner);
  }

  async getAvailableSlots(organizationId: string, eventTypeUri: string): Promise<CalendlySlot[]> {
    const tokens = await this.integrationConfig.getTokens(organizationId, 'calendly');
    if (!tokens) throw new Error('Calendly not connected');

    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      event_type: eventTypeUri,
      start_time: startTime,
      end_time: endTime,
    });

    const res = await fetch(`${this.baseUrl}/event_type_available_times?${params}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!res.ok) throw new Error(`Calendly available times failed: ${res.status}`);
    const data = (await res.json()) as { collection: Array<{ start_time: string; end_time: string; scheduling_url: string }> };

    return data.collection.map((s) => ({
      startTime: s.start_time,
      endTime: s.end_time,
      schedulingUrl: s.scheduling_url,
    }));
  }

  async createSchedulingLink(
    organizationId: string,
    eventTypeUri: string,
    maxEventCount = 1,
  ): Promise<string> {
    const tokens = await this.integrationConfig.getTokens(organizationId, 'calendly');
    if (!tokens) throw new Error('Calendly not connected');

    const res = await fetch(`${this.baseUrl}/scheduling_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_event_count: maxEventCount,
        owner: eventTypeUri,
        owner_type: 'EventType',
      }),
    });

    if (!res.ok) throw new Error(`Calendly scheduling link failed: ${res.status}`);
    const data = (await res.json()) as { resource: { booking_url: string } };
    return data.resource.booking_url;
  }

  private async registerWebhook(
    organizationId: string,
    accessToken: string,
    ownerUri: string,
  ): Promise<void> {
    const webhookUrl = this.config.getOrThrow<string>('APP_BASE_URL');
    const signingKey = this.config.getOrThrow<string>('CALENDLY_WEBHOOK_SIGNING_KEY');

    const res = await fetch(`${this.baseUrl}/webhook_subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${webhookUrl}/api/v1/integrations/calendly/webhook`,
        events: ['invitee.created', 'invitee.canceled'],
        organization: ownerUri,
        scope: 'organization',
        signing_key: signingKey,
      }),
    });

    if (!res.ok) {
      this.logger.warn(`Calendly webhook registration failed: ${res.status}`);
    }
  }
}
