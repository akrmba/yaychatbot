import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly baseUrl = 'https://api.resend.com';

  constructor(private config: ConfigService) {}

  async sendNewQualifiedLeadEmail(
    ownerEmail: string,
    lead: {
      name?: string;
      email?: string;
      company?: string;
      score: number;
      qualificationData?: Record<string, unknown>;
    },
  ): Promise<void> {
    const html = this.renderQualifiedLeadTemplate(lead);
    await this.send({
      to: ownerEmail,
      subject: `🔥 New Qualified Lead: ${lead.name ?? lead.email ?? 'Unknown'} (Score: ${lead.score})`,
      html,
    });
  }

  async sendProspectConfirmationEmail(
    prospectEmail: string,
    data: {
      prospectName?: string;
      organizationName: string;
      meetingUrl?: string;
    },
  ): Promise<void> {
    const html = this.renderProspectConfirmationTemplate(data);
    await this.send({
      to: prospectEmail,
      subject: `Thanks for chatting with ${data.organizationName}!`,
      html,
    });
  }

  async sendMeetingConfirmationEmail(
    prospectEmail: string,
    data: {
      prospectName?: string;
      organizationName: string;
      meetingUrl: string;
    },
  ): Promise<void> {
    const html = this.renderMeetingConfirmationTemplate(data);
    await this.send({
      to: prospectEmail,
      subject: `Your meeting with ${data.organizationName} is confirmed`,
      html,
    });
  }

  private async send(options: SendEmailOptions): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured — skipping email');
      return;
    }

    const fromEmail = this.config.get<string>('EMAIL_FROM', 'noreply@yaychatbot.com');

    const res = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Resend email failed: ${res.status} — ${err}`);
    }
  }

  // ── React Email-style templates (inline HTML) ──────────────────────────────

  private renderQualifiedLeadTemplate(lead: {
    name?: string;
    email?: string;
    company?: string;
    score: number;
    qualificationData?: Record<string, unknown>;
  }): string {
    const scoreColor = lead.score >= 80 ? '#16a34a' : lead.score >= 60 ? '#d97706' : '#6b7280';
    const qualRows = Object.entries(lead.qualificationData ?? {})
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;">${k}</td>
           <td style="padding:6px 12px;font-size:13px;">${String(v)}</td></tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#4f46e5;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">New Qualified Lead</h1>
      <p style="color:#c7d2fe;margin:4px 0 0;font-size:14px;">via YayChatbot</p>
    </div>
    <div style="padding:32px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
        <div style="width:48px;height:48px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:20px;">👤</div>
        <div>
          <p style="margin:0;font-weight:600;font-size:16px;">${lead.name ?? 'Unknown'}</p>
          <p style="margin:2px 0 0;color:#6b7280;font-size:14px;">${lead.email ?? ''}</p>
        </div>
        <div style="margin-left:auto;background:${scoreColor};color:#fff;padding:6px 14px;border-radius:20px;font-weight:700;font-size:14px;">${lead.score}/100</div>
      </div>
      ${lead.company ? `<p style="margin:0 0 16px;color:#374151;"><strong>Company:</strong> ${lead.company}</p>` : ''}
      ${qualRows ? `<table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;margin-top:16px;"><tbody>${qualRows}</tbody></table>` : ''}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by YayChatbot · <a href="#" style="color:#4f46e5;">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  private renderProspectConfirmationTemplate(data: {
    prospectName?: string;
    organizationName: string;
    meetingUrl?: string;
  }): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#4f46e5;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Thanks for reaching out!</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        Hi ${data.prospectName ?? 'there'},<br><br>
        Thanks for chatting with <strong>${data.organizationName}</strong>. We've received your information and will be in touch shortly.
      </p>
      ${
        data.meetingUrl
          ? `<a href="${data.meetingUrl}" style="display:inline-block;margin-top:16px;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Book a Meeting</a>`
          : ''
      }
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Powered by YayChatbot</p>
    </div>
  </div>
</body>
</html>`;
  }

  private renderMeetingConfirmationTemplate(data: {
    prospectName?: string;
    organizationName: string;
    meetingUrl: string;
  }): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#16a34a;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">📅 Meeting Confirmed</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        Hi ${data.prospectName ?? 'there'},<br><br>
        Your meeting with <strong>${data.organizationName}</strong> is confirmed. We look forward to speaking with you!
      </p>
      <a href="${data.meetingUrl}" style="display:inline-block;margin-top:16px;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Meeting Details</a>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Powered by YayChatbot</p>
    </div>
  </div>
</body>
</html>`;
  }
}
