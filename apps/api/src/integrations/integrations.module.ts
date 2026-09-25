import { Module } from '@nestjs/common';
import { CalendlyModule } from './calendly/calendly.module';
import { HubspotModule } from './hubspot/hubspot.module';
import { SlackModule } from './slack/slack.module';
import { ResendModule } from './resend/resend.module';
import { OutboundWebhooksModule } from './webhooks/outbound-webhooks.module';
import { IntegrationOrchestratorService } from './integration-orchestrator.service';

@Module({
  imports: [
    CalendlyModule,
    HubspotModule,
    SlackModule,
    ResendModule,
    OutboundWebhooksModule,
  ],
  providers: [IntegrationOrchestratorService],
  exports: [
    CalendlyModule,
    HubspotModule,
    SlackModule,
    ResendModule,
    OutboundWebhooksModule,
    IntegrationOrchestratorService,
  ],
})
export class IntegrationsModule {}
