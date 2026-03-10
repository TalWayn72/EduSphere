import { Module } from '@nestjs/common';
import { PeerMatchingService } from './peer-matching.service';
import { PeerMatchingResolver } from './peer-matching.resolver';

@Module({
  providers: [PeerMatchingService, PeerMatchingResolver],
  exports: [PeerMatchingService],
})
export class PeerMatchingModule {}
