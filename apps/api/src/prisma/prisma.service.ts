import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { getTenantContext } from "../common/context/tenant.context";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();

    // Middleware: auto-inject organizationId into queries when tenant context exists
    // $use is deprecated in Prisma 5 but still functional — types removed, so we use `any`
    (this as any).$use(
      async (
        params: {
          model?: string;
          action: string;
          args: Record<string, any>;
        },
        next: (params: any) => Promise<any>,
      ) => {
        const tenant = getTenantContext();
        if (!tenant) return next(params);

        const TENANT_SCOPED_MODELS = [
          "Widget",
          "Conversation",
          "Lead",
          "ApiKey",
          "UsageRecord",
          "AuditLog",
        ];

        // Only scope models that have organizationId directly
        if (!TENANT_SCOPED_MODELS.includes(params.model ?? "")) {
          return next(params);
        }

        const orgFilter = { organizationId: tenant.organizationId };

        switch (params.action) {
          case "findUnique":
          case "findFirst":
            params.action = "findFirst";
            params.args.where = { ...params.args.where, ...orgFilter };
            break;

          case "findMany":
            params.args.where = { ...params.args.where, ...orgFilter };
            break;

          case "create":
            params.args.data = { ...params.args.data, ...orgFilter };
            break;

          case "createMany":
            if (Array.isArray(params.args.data)) {
              params.args.data = params.args.data.map(
                (d: Record<string, unknown>) => ({ ...d, ...orgFilter }),
              );
            } else {
              params.args.data = { ...params.args.data, ...orgFilter };
            }
            break;

          case "update":
          case "updateMany":
            params.args.where = { ...params.args.where, ...orgFilter };
            break;

          case "delete":
          case "deleteMany":
            params.args.where = { ...params.args.where, ...orgFilter };
            break;

          case "count":
          case "aggregate":
          case "groupBy":
            params.args.where = { ...params.args.where, ...orgFilter };
            break;
        }

        return next(params);
      },
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
