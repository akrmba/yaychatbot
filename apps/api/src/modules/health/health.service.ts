import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const result = {
      status: "ok" as string,
      db: "ok" as string,
      redis: "not_configured" as string,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error("Database health check failed", error);
      result.status = "degraded";
      result.db = "down";
    }

    return result;
  }
}
