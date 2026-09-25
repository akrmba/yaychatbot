import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { BillingCron } from "./billing.cron";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { PlanGuard } from "./guards/plan.guard";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService, BillingCron, PlanGuard],
  exports: [BillingService, PlanGuard],
})
export class BillingModule {}
