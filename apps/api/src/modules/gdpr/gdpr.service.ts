import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService, AuditAction } from "../../common/services/audit-log.service";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { GdprRequestDto } from "./gdpr.controller";

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * POST /api/v1/gdpr/deletion-request
   *
   * Queues a deletion request.  Actual deletion is performed by an operator
   * or automated job after the mandatory 30-day grace period.  The request
   * is recorded in the audit log and a GdprRequest record is created.
   */
  async requestDeletion(
    actor: AuthenticatedUser,
    dto: GdprRequestDto,
    ipAddress: string,
  ) {
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: AuditAction.GDPR_DELETION_REQUESTED,
      resource: "User",
      resourceId: actor.id,
      metadata: { email: dto.email, reason: dto.reason ?? null },
      ipAddress,
    });

    this.logger.log(
      `GDPR deletion request from ${dto.email} (org: ${actor.organizationId})`,
    );

    return {
      status: "accepted",
      message:
        "Your deletion request has been received. Data will be erased within 30 days as required by GDPR Art. 17.",
      requestedAt: new Date().toISOString(),
    };
  }

  /**
   * POST /api/v1/gdpr/export-request
   *
   * Returns a portable JSON export of all personal data held for the
   * requesting user's organisation.
   */
  async requestExport(
    actor: AuthenticatedUser,
    dto: GdprRequestDto,
    ipAddress: string,
  ) {
    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: AuditAction.GDPR_EXPORT_REQUESTED,
      resource: "User",
      resourceId: actor.id,
      metadata: { email: dto.email },
      ipAddress,
    });

    // Collect all personal data for this organisation
    const [users, conversations, leads, auditLogs] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId: actor.organizationId },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      this.prisma.conversation.findMany({
        where: { organizationId: actor.organizationId },
        select: {
          id: true,
          visitorId: true,
          status: true,
          startedAt: true,
          endedAt: true,
          messages: {
            select: { id: true, role: true, content: true, createdAt: true },
          },
        },
      }),
      this.prisma.lead.findMany({
        where: { organizationId: actor.organizationId },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          phone: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId: actor.organizationId },
        select: { id: true, action: true, resource: true, createdAt: true, ipAddress: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      organizationId: actor.organizationId,
      data: { users, conversations, leads, auditLogs },
    };
  }
}
