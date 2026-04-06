import { Module } from '@nestjs/common';
import { EmbeddingResolver } from './embedding.resolver';
import { EmbeddingService } from './embedding.service';
import { EmbeddingStoreService } from './embedding-store.service';
import { EmbeddingProviderService } from './embedding-provider.service';
import { EmbeddingFallbackService } from './embedding-fallback.service';
import { KsChunkEmbeddingStoreService } from './ks-chunk-embedding-store.service';

@Module({
  providers: [
    EmbeddingResolver,
    EmbeddingService,
    EmbeddingFallbackService,
    EmbeddingStoreService,
    EmbeddingProviderService,
    KsChunkEmbeddingStoreService,
  ],
  exports: [EmbeddingService, KsChunkEmbeddingStoreService],
})
export class EmbeddingModule {}
