import { Module } from '@nestjs/common';
import { SavedSearchService } from './saved-search.service.js';
import { SavedSearchResolver } from './saved-search.resolver.js';

@Module({
  providers: [SavedSearchService, SavedSearchResolver],
  exports: [SavedSearchService],
})
export class SavedSearchModule {}
