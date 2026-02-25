import { Module } from '@nestjs/common';
import { LibraryService } from './library.service.js';
import { LibraryResolver } from './library.resolver.js';

@Module({
  providers: [LibraryService, LibraryResolver],
  exports: [LibraryService],
})
export class LibraryModule {}
