import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Res,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CalendlyService } from './calendly.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('integrations/calendly')
@Controller('integrations/calendly')
export class CalendlyController {
  private readonly logger = new Logger(CalendlyController.name);

  constructor(
    private calendly: CalendlyService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  @Get('connect')
  @ApiOperation({ summary: 'Start Calendly OAuth flow' })
  connect(@Req() req: Request, @Res() res: Response) {
    const organizationId = (req.user as { organizationId: string }).organizationId;
    const url = this.calendly.getOAuthUrl(organizationId);
    res.redirect(url);
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Calendly OAuth callback' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { organizationId } = JSON.parse(Buffer.from(state, 'base64url').toString());
    await this.calendly.handleCallback(code, organizationId);
    const dashboardUrl = this.config.get<string>('DASHBOARD_URL', 'http://localhost:3001');
    res.redirect(`${dashboardUrl}/settings/integrations?connected=calendly`);
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Calendly webhook events' })
  async webhook(
    @Headers('calendly-webhook-signature') signature: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    this.verifyCalendlySignature(signature, req);

    const event = body['event'] as string;
    const payload = body['payload'] as Record<string, unknown>;

    if (event === 'invitee.created') {
      await this.handleInviteeCreated(payload);
    }

    return { received: true };
  }

  private async handleInviteeCreated(payload: Record<string, unknown>): Promise<void> {
    const inviteeEmail = (payload['email'] as string | undefined)?.toLowerCase();
    if (!inviteeEmail) return;

    // Find lead by email and mark meeting as booked
    const lead = await this.prisma.lead.findFirst({
      where: { email: inviteeEmail },
      orderBy: { createdAt: 'desc' },
    });

    if (!lead) return;

    const eventUri = payload['event'] as string | undefined;
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        meetingBooked: true,
        meetingUrl: eventUri ?? null,
        updatedAt: new Date(),
      },
    });

    await this.prisma.conversation.update({
      where: { id: lead.conversationId },
      data: { status: 'BOOKED' },
    });

    this.logger.log(`Meeting booked for lead ${lead.id} (${inviteeEmail})`);
  }

  private verifyCalendlySignature(signature: string, req: Request): void {
    const signingKey = this.config.get<string>('CALENDLY_WEBHOOK_SIGNING_KEY', '');
    if (!signingKey) return; // skip in dev if not configured

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) throw new BadRequestException('Missing raw body');

    const expected = crypto
      .createHmac('sha256', signingKey)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature ?? ''), Buffer.from(expected))) {
      throw new BadRequestException('Invalid Calendly signature');
    }
  }
}
