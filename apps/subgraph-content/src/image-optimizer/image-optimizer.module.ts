import { Module } from '@nestjs/common';
import { ImageOptimizerService } from './image-optimizer.service';

@Module({
  providers: [ImageOptimizerService],
  exports: [ImageOptimizerService],
})
export class ImageOptimizerModule {}
