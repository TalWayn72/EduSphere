import { Module } from '@nestjs/common';
import { EmbeddingResolver } from './embedding.resolver';
import { EmbeddingService } from './embedding.service';

@Module({
  providers: [EmbeddingResolver, EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
