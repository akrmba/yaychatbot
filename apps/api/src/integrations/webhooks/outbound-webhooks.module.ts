import { Module } from '@nestjs/common';
import { OutboundWebhookService } from './outbound-webhook.service';
import { OutboundWebhookController } from './outbound-webhook.controller';
import { SharedIntegrationsModule } from '../shared/shared-integrations.module';

@Module({
  imports: [SharedIntegrationsModule],
  controllers: [OutboundWebhookController],
  providers: [OutboundWebhookService],
  exports: [OutboundWebhookService],
})
export class OutboundWebhooksModule {}
