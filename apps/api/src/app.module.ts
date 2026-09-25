import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";

import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { WidgetsModule } from "./modules/widgets/widgets.module";
import { PlaybooksModule } from "./modules/playbooks/playbooks.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { BillingModule } from "./modules/billing/billing.module";
import { ChatModule } from "./modules/chat/chat.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { GdprModule } from "./modules/gdpr/gdpr.module";
import { CommonServicesModule } from "./common/services/common-services.module";

import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { ApiKeyGuard } from "./modules/auth/guards/api-key.guard";
import { RolesGuard } from "./modules/auth/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 100,
      },
      {
        // 20 conversations per hour per IP (applied via @Throttle decorator on chat endpoint)
        name: "conversation",
        ttl: 3_600_000,
        limit: 20,
      },
      {
        // 5 login attempts per 15 minutes per IP
        name: "auth",
        ttl: 900_000,
        limit: 5,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    WidgetsModule,
    PlaybooksModule,
    ConversationsModule,
    LeadsModule,
    BillingModule,
    ChatModule,
    IntegrationsModule,
    CommonServicesModule,
    GdprModule,
  ],
  providers: [
    // Order matters: Throttle → JWT → ApiKey fallback → Roles
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
