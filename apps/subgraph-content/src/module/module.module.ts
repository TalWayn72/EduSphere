import { Module } from '@nestjs/common';
import { ModuleResolver } from './module.resolver';
import { ModuleService } from './module.service';
import { ModuleLoader } from './module.loader';
import { ContentItemModule } from '../content-item/content-item.module';

@Module({
  imports: [ContentItemModule],
  providers: [ModuleResolver, ModuleService, ModuleLoader],
  exports: [ModuleService, ModuleLoader],
})
export class ModuleModule {}
