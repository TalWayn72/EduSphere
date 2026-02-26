import { Module } from '@nestjs/common';
import { ContentItemResolver } from './content-item.resolver';
import { ContentItemService } from './content-item.service';
import { ContentItemLoader } from './content-item.loader';

@Module({
  providers: [ContentItemResolver, ContentItemService, ContentItemLoader],
  exports: [ContentItemService, ContentItemLoader],
})
export class ContentItemModule {}
