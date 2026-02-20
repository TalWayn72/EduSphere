import { Module } from '@nestjs/common';
import { CourseResolver } from './course.resolver';
import { CourseService } from './course.service';
import { EnrollmentService } from './enrollment.service';
import { ModuleModule } from '../module/module.module';

@Module({
  imports: [ModuleModule],
  providers: [CourseResolver, CourseService, EnrollmentService],
  exports: [CourseService, EnrollmentService],
})
export class CourseModule {}
