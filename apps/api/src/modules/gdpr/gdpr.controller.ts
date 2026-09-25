import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";
import { Request } from "express";
import { GdprService } from "./gdpr.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";

export class GdprRequestDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

@ApiTags("GDPR")
@ApiBearerAuth()
@Controller("gdpr")
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Post("deletion-request")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Submit a GDPR data deletion (right to erasure) request" })
  async deletionRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GdprRequestDto,
    @Req() req: Request,
  ) {
    return this.gdprService.requestDeletion(user, dto, req.ip ?? "unknown");
  }

  @Post("export-request")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Submit a GDPR data export (right of access) request" })
  async exportRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GdprRequestDto,
    @Req() req: Request,
  ) {
    return this.gdprService.requestExport(user, dto, req.ip ?? "unknown");
  }
}
