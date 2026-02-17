import { Module } from '@nestjs/common';
import { AnnotationResolver } from './annotation.resolver';
import { AnnotationService } from './annotation.service';

@Module({
  providers: [AnnotationResolver, AnnotationService],
  exports: [AnnotationService],
})
export class AnnotationModule {}
