import { Module } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { TranslationResolver } from './translation.resolver';

@Module({
  providers: [TranslationService, TranslationResolver],
  exports: [TranslationService],
})
export class TranslationModule {}
