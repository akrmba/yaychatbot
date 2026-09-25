import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface OutboundWebhookPayload {
  event: string;
  organizationId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookJob {
  webhookConfigId: string;
  url: string;
  secret: string;
  payload: OutboundWebhookPayload;
  attempt: number;
}

@Injectable()
export class WebhookQueueService {
  private readonly logger = new Logger(WebhookQueueService.name);
  // In-memory queue for jobs pending delivery (Bull/Redis optional upgrade path)
  private readonly queue: WebhookJob[] = [];
  private processing = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async enqueue(
    organizationId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const configs = await this.prisma.webhookConfig.findMany({
      where: { organizationId, isActive: true },
    });

    const payload: OutboundWebhookPayload = {
      event,
      organizationId,
      data,
      timestamp: new Date().toISOString(),
    };

    for (const cfg of configs) {
      this.queue.push({
        webhookConfigId: cfg.id,
        url: cfg.url,
        secret: cfg.secret,
        payload,
        attempt: 1,
      });
    }

    if (!this.processing) {
      void this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await this.deliver(job);
    }
    this.processing = false;
  }

  private async deliver(job: WebhookJob): Promise<void> {
    const body = JSON.stringify(job.payload);
    const signature = this.sign(body, job.secret);

    try {
      const res = await fetch(job.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-YayChatbot-Signature': signature,
          'X-YayChatbot-Event': job.payload.event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      await this.prisma.webhookDelivery.create({
        data: {
          webhookConfigId: job.webhookConfigId,
          event: job.payload.event,
          statusCode: res.status,
          success: res.ok,
          attempt: job.attempt,
        },
      });

      if (!res.ok) {
        this.scheduleRetry(job);
      }
    } catch (err) {
      this.logger.warn(`Webhook delivery failed (attempt ${job.attempt}): ${String(err)}`);
      await this.prisma.webhookDelivery.create({
        data: {
          webhookConfigId: job.webhookConfigId,
          event: job.payload.event,
          statusCode: 0,
          success: false,
          attempt: job.attempt,
          error: String(err),
        },
      });
      this.scheduleRetry(job);
    }
  }

  private scheduleRetry(job: WebhookJob): void {
    const MAX_ATTEMPTS = 5;
    if (job.attempt >= MAX_ATTEMPTS) return;

    // Exponential backoff: 5s, 25s, 125s, 625s
    const delayMs = Math.pow(5, job.attempt) * 1000;
    setTimeout(() => {
      this.queue.push({ ...job, attempt: job.attempt + 1 });
      if (!this.processing) void this.processQueue();
    }, delayMs);
  }

  private sign(body: string, secret: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  }
}
