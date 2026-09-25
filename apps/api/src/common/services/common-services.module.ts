import { Global, Module } from "@nestjs/common";
import { SanitizationService } from "./sanitization.service";
import { AuditLogService } from "./audit-log.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SanitizationService, AuditLogService],
  exports: [SanitizationService, AuditLogService],
})
export class CommonServicesModule {}
