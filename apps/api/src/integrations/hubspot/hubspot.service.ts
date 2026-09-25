import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationConfigService } from '../shared/integration-config.service';
import { PrismaService } from '../../prisma/prisma.service';

interface HubSpotContact {
  id: string;
  properties: Record<string, string>;
}

@Injectable()
export class HubspotService {
  private readonly logger = new Logger(HubspotService.name);
  private readonly baseUrl = 'https://api.hubapi.com';

  constructor(
    private config: ConfigService,
    private integrationConfig: IntegrationConfigService,
    private prisma: PrismaService,
  ) {}

  getOAuthUrl(organizationId: string): string {
    const clientId = this.config.getOrThrow<string>('HUBSPOT_CLIENT_ID');
    const redirectUri = this.config.getOrThrow<string>('HUBSPOT_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ organizationId })).toString('base64url');
    const scopes = 'crm.objects.contacts.write crm.objects.deals.write';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
    });
    return `https://app.hubspot.com/oauth/authorize?${params}`;
  }

  async handleCallback(code: string, organizationId: string): Promise<void> {
    const clientId = this.config.getOrThrow<string>('HUBSPOT_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('HUBSPOT_CLIENT_SECRET');
    const redirectUri = this.config.getOrThrow<string>('HUBSPOT_REDIRECT_URI');

    const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!res.ok) throw new Error(`HubSpot token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    await this.integrationConfig.upsert(organizationId, 'hubspot', {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    });
  }

  async upsertContact(
    organizationId: string,
    leadData: {
      email: string;
      name?: string;
      company?: string;
      phone?: string;
      score?: number;
      qualificationData?: Record<string, unknown>;
    },
  ): Promise<HubSpotContact> {
    const token = await this.getValidToken(organizationId);

    const [firstname, ...rest] = (leadData.name ?? '').split(' ');
    const lastname = rest.join(' ');

    const properties: Record<string, string> = {
      email: leadData.email,
      firstname: firstname ?? '',
      lastname: lastname ?? '',
      company: leadData.company ?? '',
      phone: leadData.phone ?? '',
      yay_lead_score: String(leadData.score ?? 0),
      yay_qualification_data: JSON.stringify(leadData.qualificationData ?? {}),
      lead_source: 'YayChatbot',
    };

    // Try update first, then create (upsert by email)
    const searchRes = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: leadData.email }] }],
      }),
    });

    const searchData = (await searchRes.json()) as { results: HubSpotContact[] };
    const existing = searchData.results?.[0];

    if (existing) {
      const patchRes = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/${existing.id}`, {
        method: 'PATCH',
        headers: this.headers(token),
        body: JSON.stringify({ properties }),
      });
      if (!patchRes.ok) throw new Error(`HubSpot contact update failed: ${patchRes.status}`);
      return (await patchRes.json()) as HubSpotContact;
    }

    const createRes = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({ properties }),
    });
    if (!createRes.ok) throw new Error(`HubSpot contact create failed: ${createRes.status}`);
    return (await createRes.json()) as HubSpotContact;
  }

  async createDeal(
    organizationId: string,
    contactId: string,
    leadData: {
      name?: string;
      company?: string;
      score: number;
    },
  ): Promise<void> {
    const token = await this.getValidToken(organizationId);

    const dealRes = await fetch(`${this.baseUrl}/crm/v3/objects/deals`, {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({
        properties: {
          dealname: `${leadData.company ?? leadData.name ?? 'New Lead'} — YayChatbot`,
          dealstage: 'appointmentscheduled',
          pipeline: 'default',
          yay_lead_score: String(leadData.score),
        },
      }),
    });

    if (!dealRes.ok) throw new Error(`HubSpot deal create failed: ${dealRes.status}`);
    const deal = (await dealRes.json()) as { id: string };

    // Associate deal with contact
    await fetch(
      `${this.baseUrl}/crm/v3/objects/deals/${deal.id}/associations/contacts/${contactId}/deal_to_contact`,
      { method: 'PUT', headers: this.headers(token) },
    );
  }

  /** Called by LeadsService after qualification — syncs to HubSpot and creates deal for Growth+ */
  async syncLead(organizationId: string, leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead?.email) return;

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return;

    const contact = await this.upsertContact(organizationId, {
      email: lead.email,
      name: lead.name ?? undefined,
      company: lead.company ?? undefined,
      phone: lead.phone ?? undefined,
      score: lead.score,
      qualificationData: (lead.qualificationData as Record<string, unknown>) ?? {},
    });

    // Create deal only for Growth+ plans with score >= 60
    const highValuePlans = ['GROWTH', 'SCALE'];
    if (highValuePlans.includes(org.plan) && lead.score >= 60) {
      await this.createDeal(organizationId, contact.id, {
        name: lead.name ?? undefined,
        company: lead.company ?? undefined,
        score: lead.score,
      });
    }
  }

  private async getValidToken(organizationId: string): Promise<string> {
    const tokens = await this.integrationConfig.getTokens(organizationId, 'hubspot');
    if (!tokens) throw new Error('HubSpot not connected');

    // Refresh if within 5 minutes of expiry
    if (tokens.expiresAt && tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      return this.refreshToken(organizationId, tokens.refreshToken!);
    }

    return tokens.accessToken;
  }

  private async refreshToken(organizationId: string, refreshToken: string): Promise<string> {
    const clientId = this.config.getOrThrow<string>('HUBSPOT_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('HUBSPOT_CLIENT_SECRET');

    const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`HubSpot token refresh failed: ${res.status}`);
    const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };

    await this.integrationConfig.upsert(organizationId, 'hubspot', {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    });

    return data.access_token;
  }

  private headers(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}
