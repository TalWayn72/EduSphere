import { Module } from '@nestjs/common';
import { ChavrutaPartnerMatchService } from './chavruta-partner.service';
import { ChavrutaPartnerMatchResolver } from './chavruta-partner.resolver';

@Module({
  providers: [ChavrutaPartnerMatchService, ChavrutaPartnerMatchResolver],
  exports: [ChavrutaPartnerMatchService],
})
export class ChavrutaPartnerModule {}
