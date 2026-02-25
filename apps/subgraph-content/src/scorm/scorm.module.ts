import { Module } from '@nestjs/common';
import { ScormResolver } from './scorm.resolver';
import { ScormImportService } from './scorm-import.service';
import { ScormSessionService } from './scorm-session.service';
import { ScormExportService } from './scorm-export.service';
import { ScormController } from './scorm.controller';

@Module({
  controllers: [ScormController],
  providers: [ScormResolver, ScormImportService, ScormSessionService, ScormExportService],
  exports: [ScormSessionService, ScormExportService],
})
export class ScormModule {}
