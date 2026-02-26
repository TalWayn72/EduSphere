import { Module } from '@nestjs/common';
import { CourseResolver } from './course.resolver';
import { CourseService } from './course.service';
import { EnrollmentService } from './enrollment.service';
import { AdminEnrollmentService } from './admin-enrollment.service';
import { ModuleModule } from '../module/module.module';

@Module({
  imports: [ModuleModule],
  providers: [
    CourseResolver,
    CourseService,
    EnrollmentService,
    AdminEnrollmentService,
  ],
  exports: [CourseService, EnrollmentService, AdminEnrollmentService],
})
export class CourseModule {}
