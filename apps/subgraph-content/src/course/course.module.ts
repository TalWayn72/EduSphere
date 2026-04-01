import { Module } from '@nestjs/common';
import { CourseResolver } from './course.resolver';
import { CourseService } from './course.service';
import { CoursePublishService } from './course-publish.service';
import { EnrollmentService } from './enrollment.service';
import { AdminEnrollmentService } from './admin-enrollment.service';
import { ComplianceLibraryService } from './compliance-library.service';
import { ModuleModule } from '../module/module.module';

@Module({
  imports: [ModuleModule],
  providers: [
    CourseResolver,
    CoursePublishService,
    CourseService,
    EnrollmentService,
    AdminEnrollmentService,
    ComplianceLibraryService,
  ],
  exports: [
    CourseService,
    EnrollmentService,
    AdminEnrollmentService,
    ComplianceLibraryService,
  ],
})
export class CourseModule {}
