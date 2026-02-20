import { Module } from '@nestjs/common';
import { ContentItemResolver } from './content-item.resolver';
import { ContentItemService } from './content-item.service';

@Module({
  providers: [ContentItemResolver, ContentItemService],
  exports: [ContentItemService],
})
export class ContentItemModule {}
