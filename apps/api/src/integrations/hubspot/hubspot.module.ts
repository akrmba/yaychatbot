import { Module } from '@nestjs/common';
import { HubspotService } from './hubspot.service';
import { HubspotController } from './hubspot.controller';
import { SharedIntegrationsModule } from '../shared/shared-integrations.module';

@Module({
  imports: [SharedIntegrationsModule],
  controllers: [HubspotController],
  providers: [HubspotService],
  exports: [HubspotService],
})
export class HubspotModule {}
