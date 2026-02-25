import { Module } from '@nestjs/common';
import { MicrolearningResolver } from './microlearning.resolver';
import { MicrolearningService } from './microlearning.service';
import { ContentItemModule } from '../content-item/content-item.module';

@Module({
  imports: [ContentItemModule],
  providers: [MicrolearningResolver, MicrolearningService],
  exports: [MicrolearningService],
})
export class MicrolearningModule {}
