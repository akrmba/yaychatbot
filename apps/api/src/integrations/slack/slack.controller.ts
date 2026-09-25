import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SlackService } from './slack.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('integrations/slack')
@Controller('integrations/slack')
export class SlackController {
  constructor(
    private slack: SlackService,
    private config: ConfigService,
  ) {}

  @Get('connect')
  @ApiOperation({ summary: 'Start Slack OAuth flow' })
  connect(@Req() req: Request, @Res() res: Response) {
    const organizationId = (req.user as { organizationId: string }).organizationId;
    res.redirect(this.slack.getOAuthUrl(organizationId));
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Slack OAuth callback' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { organizationId } = JSON.parse(Buffer.from(state, 'base64url').toString());
    await this.slack.handleCallback(code, organizationId);
    const dashboardUrl = this.config.get<string>('DASHBOARD_URL', 'http://localhost:3001');
    res.redirect(`${dashboardUrl}/settings/integrations?connected=slack`);
  }
}
