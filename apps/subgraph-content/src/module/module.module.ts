import { Module } from '@nestjs/common';
import { ModuleResolver } from './module.resolver';
import { ModuleService } from './module.service';
import { ContentItemModule } from '../content-item/content-item.module';

@Module({
  imports: [ContentItemModule],
  providers: [ModuleResolver, ModuleService],
  exports: [ModuleService],
})
export class ModuleModule {}
