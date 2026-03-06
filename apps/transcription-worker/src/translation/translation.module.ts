import { Module } from '@nestjs/common';
import { NatsModule } from '../nats/nats.module';
import { TranslationService } from './translation.service';

@Module({
  imports: [NatsModule],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
