/**
 * AuditLogService — immutable append-only audit trail.
 *
 * Rules:
 *  - Records are NEVER updated or deleted via this service.
 *  - Every sensitive action (login, billing change, API key lifecycle,
 *    GDPR requests, data deletion) must be logged here.
 *  - ipAddress is always captured from the request context when available.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export const AuditAction = {
  // Auth
  USER_REGISTERED: "user.registered",
  USER_LOGIN: "user.login",
  USER_LOGIN_FAILED: "user.login_failed",
  // API Keys
  APIKEY_CREATED: "apikey.created",
  APIKEY_REVOKED: "apikey.revoked",
  // Billing
  BILLING_SUBSCRIBED: "billing.subscribed",
  BILLING_PLAN_CHANGED: "billing.plan_changed",
  BILLING_CANCELLED: "billing.cancelled",
  // GDPR
  GDPR_DELETION_REQUESTED: "gdpr.deletion_requested",
  GDPR_EXPORT_REQUESTED: "gdpr.export_requested",
  GDPR_DATA_DELETED: "gdpr.data_deleted",
  GDPR_DATA_ANONYMIZED: "gdpr.data_anonymized",
  // Retention
  RETENTION_RUN: "retention.run",
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditLogEntry {
  organizationId: string;
  actorId?: string;
  action: AuditActionType | string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append an immutable audit record.  Failures are logged but never thrown —
   * audit logging must never break the primary request flow.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          actorId: entry.actorId ?? null,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          metadata: entry.metadata ?? {},
          ipAddress: entry.ipAddress ?? null,
        },
      });
    } catch (err) {
      // Audit failures must not surface to callers
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`, entry);
    }
  }

  /** Paginated query for the dashboard audit trail view. */
  async query(
    organizationId: string,
    opts: { page?: number; limit?: number; action?: string } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 50);
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(opts.action ? { action: opts.action } : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
          actor: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { records, total, page, limit };
  }
}
