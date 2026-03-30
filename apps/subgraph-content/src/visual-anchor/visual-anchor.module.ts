import { Module } from '@nestjs/common';
import { VisualAnchorService } from './visual-anchor.service';
import { VisualAnchorQueryService } from './visual-anchor-query.service';
import { VisualAnchorResolver } from './visual-anchor.resolver';
import { ClamavModule } from '../clamav/clamav.module';
import { ImageOptimizerModule } from '../image-optimizer/image-optimizer.module';

@Module({
  imports: [ClamavModule, ImageOptimizerModule],
  providers: [VisualAnchorService, VisualAnchorQueryService, VisualAnchorResolver],
  exports: [VisualAnchorService],
})
export class VisualAnchorModule {}
