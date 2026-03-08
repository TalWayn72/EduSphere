import { Module } from '@nestjs/common';
import { VisualAnchorService } from './visual-anchor.service';
import { VisualAnchorResolver } from './visual-anchor.resolver';
import { ClamavModule } from '../clamav/clamav.module';
import { ImageOptimizerModule } from '../image-optimizer/image-optimizer.module';

@Module({
  imports: [ClamavModule, ImageOptimizerModule],
  providers: [VisualAnchorService, VisualAnchorResolver],
  exports: [VisualAnchorService],
})
export class VisualAnchorModule {}
