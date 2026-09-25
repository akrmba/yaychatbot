import { Module } from '@nestjs/common';
import { CalendlyService } from './calendly.service';
import { CalendlyController } from './calendly.controller';
import { SharedIntegrationsModule } from '../shared/shared-integrations.module';

@Module({
  imports: [SharedIntegrationsModule],
  controllers: [CalendlyController],
  providers: [CalendlyService],
  exports: [CalendlyService],
})
export class CalendlyModule {}
