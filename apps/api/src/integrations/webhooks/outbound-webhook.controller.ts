import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsUrl, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { OutboundWebhookService } from './outbound-webhook.service';

class CreateWebhookDto {
  @IsUrl()
  url: string;

  @IsString()
  @MinLength(16)
  secret: string;

  @IsString({ each: true })
  events: string[];
}

@ApiTags('integrations/webhooks')
@Controller('integrations/webhooks')
export class OutboundWebhookController {
  constructor(private webhookService: OutboundWebhookService) {}

  @Post()
  @ApiOperation({ summary: 'Register a customer webhook endpoint' })
  create(@Req() req: Request, @Body() dto: CreateWebhookDto) {
    const organizationId = (req.user as { organizationId: string }).organizationId;
    return this.webhookService.create(organizationId, dto.url, dto.secret, dto.events);
  }

  @Get()
  @ApiOperation({ summary: 'List webhook endpoints for this organization' })
  list(@Req() req: Request) {
    const organizationId = (req.user as { organizationId: string }).organizationId;
    return this.webhookService.list(organizationId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  remove(@Req() req: Request, @Param('id') id: string) {
    const organizationId = (req.user as { organizationId: string }).organizationId;
    return this.webhookService.remove(organizationId, id);
  }
}
