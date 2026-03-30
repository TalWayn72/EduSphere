import { Module } from '@nestjs/common';
import { AnnotationResolver } from './annotation.resolver';
import { AnnotationService } from './annotation.service';
import { AnnotationQueriesService } from './annotation-queries.service';

@Module({
  providers: [AnnotationResolver, AnnotationService, AnnotationQueriesService],
  exports: [AnnotationService],
})
export class AnnotationModule {}
