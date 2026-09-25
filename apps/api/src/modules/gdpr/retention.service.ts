/**
 * RetentionService — daily cron that deletes or anonymises conversations
 * older than org.dataRetentionMonths.
 *
 * Schedule: 02:00 UTC every day.
 * Strategy:
 *   - Messages are hard-deleted (content is PII).
 *   - Conversation record is anonymised (visitorId replaced with a hash,
 *     utm/qualification JSON cleared) so aggregate counts remain intact.
 *   - Leads linked to expired conversations are anonymised (PII fields nulled).
 */
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createHash } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService, AuditAction } from "../../common/services/audit-log.service";

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runRetentionPurge(): Promise<void> {
    this.logger.log("Retention purge started");

    const orgs = await this.prisma.organization.findMany({
      select: { id: true, dataRetentionMonths: true },
    });

    let totalAnonymised = 0;

    for (const org of orgs) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - org.dataRetentionMonths);

      const expiredConversations = await this.prisma.conversation.findMany({
        where: {
          organizationId: org.id,
          startedAt: { lt: cutoff },
        },
        select: { id: true, visitorId: true },
      });

      if (expiredConversations.length === 0) continue;

      const ids = expiredConversations.map((c) => c.id);

      // 1. Hard-delete all messages (raw PII content)
      await this.prisma.message.deleteMany({
        where: { conversationId: { in: ids } },
      });

      // 2. Anonymise leads linked to these conversations
      await this.prisma.lead.updateMany({
        where: { conversationId: { in: ids } },
        data: {
          email: null,
          name: null,
          company: null,
          phone: null,
          qualificationData: {},
          notes: null,
        },
      });

      // 3. Anonymise conversation records (keep for analytics counts)
      for (const conv of expiredConversations) {
        const anonId = createHash("sha256")
          .update(`${conv.visitorId}:${org.id}:retention`)
          .digest("hex")
          .slice(0, 16);

        await this.prisma.conversation.update({
          where: { id: conv.id },
          data: {
            visitorId: `anon_${anonId}`,
            utm: {},
            qualification: {},
          },
        });
      }

      totalAnonymised += expiredConversations.length;

      await this.audit.log({
        organizationId: org.id,
        action: AuditAction.RETENTION_RUN,
        resource: "Conversation",
        metadata: {
          conversationsProcessed: expiredConversations.length,
          cutoffDate: cutoff.toISOString(),
          retentionMonths: org.dataRetentionMonths,
        },
      });
    }

    this.logger.log(`Retention purge complete — ${totalAnonymised} conversations anonymised`);
  }
}
