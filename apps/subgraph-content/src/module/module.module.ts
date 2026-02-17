import { Module } from '@nestjs/common';
import { ModuleResolver } from './module.resolver';
import { ModuleService } from './module.service';

@Module({
  providers: [ModuleResolver, ModuleService],
  exports: [ModuleService],
})
export class ModuleModule {}
