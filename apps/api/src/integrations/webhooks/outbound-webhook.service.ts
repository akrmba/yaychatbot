import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookQueueService } from '../shared/webhook-queue.service';

@Injectable()
export class OutboundWebhookService {
  constructor(
    private prisma: PrismaService,
    private queue: WebhookQueueService,
  ) {}

  async create(
    organizationId: string,
    url: string,
    secret: string,
    events: string[],
  ) {
    return this.prisma.webhookConfig.create({
      data: { organizationId, url, secret, events, isActive: true },
      select: { id: true, url: true, events: true, isActive: true, createdAt: true },
    });
  }

  async list(organizationId: string) {
    return this.prisma.webhookConfig.findMany({
      where: { organizationId },
      select: { id: true, url: true, events: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.prisma.webhookConfig.deleteMany({ where: { id, organizationId } });
  }

  /** Fire-and-forget: enqueue a signed payload to all registered endpoints */
  async dispatch(
    organizationId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.queue.enqueue(organizationId, event, data);
  }
}
