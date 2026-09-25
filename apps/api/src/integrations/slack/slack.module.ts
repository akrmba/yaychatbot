import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';
import { SharedIntegrationsModule } from '../shared/shared-integrations.module';

@Module({
  imports: [SharedIntegrationsModule],
  controllers: [SlackController],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
