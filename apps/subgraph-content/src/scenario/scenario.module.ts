import { Module } from '@nestjs/common';
import { ScenarioResolver } from './scenario.resolver';
import { ScenarioService } from './scenario.service';

@Module({
  providers: [ScenarioResolver, ScenarioService],
  exports: [ScenarioService],
})
export class ScenarioModule {}
