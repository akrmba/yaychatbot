import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { IntegrationConfigService } from './integration-config.service';
import { WebhookQueueService } from './webhook-queue.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EncryptionService, IntegrationConfigService, WebhookQueueService],
  exports: [EncryptionService, IntegrationConfigService, WebhookQueueService],
})
export class SharedIntegrationsModule {}
