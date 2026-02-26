import { Module } from '@nestjs/common';
import { EmbeddingResolver } from './embedding.resolver';
import { EmbeddingService } from './embedding.service';
import { EmbeddingStoreService } from './embedding-store.service';
import { EmbeddingProviderService } from './embedding-provider.service';

@Module({
  providers: [
    EmbeddingResolver,
    EmbeddingService,
    EmbeddingStoreService,
    EmbeddingProviderService,
  ],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
