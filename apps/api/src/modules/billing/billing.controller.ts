import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import {
  CreateSubscriptionDto,
  UpdateCostCapDto,
  BillingPortalResponseDto,
  UsageSummaryDto,
} from "./dto/billing.dto";

@ApiTags("Billing")
@ApiBearerAuth()
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("subscribe")
  @ApiOperation({ summary: "Create a Stripe subscription with 14-day trial" })
  @ApiCreatedResponse({ description: "Subscription created; clientSecret for payment setup" })
  async subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.billingService.createSubscription(user.organizationId, dto.plan);
  }

  @Post("portal")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate a Stripe Customer Portal URL" })
  @ApiOkResponse({ type: BillingPortalResponseDto })
  async portal(@CurrentUser() user: AuthenticatedUser): Promise<BillingPortalResponseDto> {
    const url = await this.billingService.createBillingPortalSession(user.organizationId);
    return { url };
  }

  @Get("usage")
  @ApiOperation({ summary: "Get current usage vs plan limits" })
  @ApiOkResponse({ type: UsageSummaryDto })
  async usage(@CurrentUser() user: AuthenticatedUser): Promise<UsageSummaryDto> {
    return this.billingService.getUsageSummary(user.organizationId) as Promise<UsageSummaryDto>;
  }

  @Get("invoices")
  @ApiOperation({ summary: "List Stripe invoices for the organization" })
  async invoices(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getInvoices(user.organizationId);
  }

  @Put("cost-cap")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set or remove a monthly spend ceiling" })
  async setCostCap(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCostCapDto,
  ): Promise<void> {
    await this.billingService.updateCostCap(user.organizationId, dto.costCapCents);
  }
}
