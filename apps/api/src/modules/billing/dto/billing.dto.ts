import { IsEnum, IsOptional, IsNumber, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Plan } from "@prisma/client";

export class CreateSubscriptionDto {
  @ApiProperty({ enum: Plan, example: Plan.GROWTH })
  @IsEnum(Plan)
  plan: Plan;
}

export class UpdateCostCapDto {
  @ApiPropertyOptional({ description: "Monthly spend ceiling in USD cents. 0 = disabled.", example: 20000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  costCapCents: number;
}

export class BillingPortalResponseDto {
  @ApiProperty()
  url: string;
}

export class UsageSummaryDto {
  @ApiProperty()
  plan: Plan;

  @ApiProperty()
  conversationCount: number;

  @ApiProperty()
  conversationLimit: number;

  @ApiProperty()
  usagePercent: number;

  @ApiProperty()
  isOverLimit: boolean;

  @ApiProperty()
  widgetCount: number;

  @ApiProperty()
  widgetLimit: number;

  @ApiProperty({ nullable: true })
  costCapCents: number | null;

  @ApiProperty({ nullable: true })
  currentSpendCents: number | null;

  @ApiProperty({ nullable: true })
  trialEndsAt: string | null;

  @ApiProperty()
  month: string;
}
