import { Module } from '@nestjs/common';
import { ConsentResolver } from './consent.resolver';
import { ConsentService } from './consent.service';

@Module({
  providers: [ConsentResolver, ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
