import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BillingService } from "./billing.service";

@Injectable()
export class BillingCron {
  private readonly logger = new Logger(BillingCron.name);

  constructor(private readonly billingService: BillingService) {}

  /** Report metered usage to Stripe every day at 02:00 UTC */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async reportDailyUsage(): Promise<void> {
    this.logger.log("Starting daily usage report to Stripe...");
    try {
      await this.billingService.reportUsageForAllOrgs();
      this.logger.log("Daily usage report complete");
    } catch (err) {
      this.logger.error("Daily usage report failed", err);
    }
  }
}
