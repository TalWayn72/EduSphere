import { Module } from '@nestjs/common';
import { ScormResolver } from './scorm.resolver';
import { ScormImportService } from './scorm-import.service';
import { ScormSessionService } from './scorm-session.service';
import { ScormExportService } from './scorm-export.service';
import { ScormController } from './scorm.controller';
import { Cmi5LauncherService } from './cmi5-launcher.service';
import { XapiModule } from '../xapi/xapi.module';

@Module({
  imports: [XapiModule],
  controllers: [ScormController],
  providers: [
    ScormResolver,
    ScormImportService,
    ScormSessionService,
    ScormExportService,
    Cmi5LauncherService,
  ],
  exports: [ScormSessionService, ScormExportService, Cmi5LauncherService],
})
export class ScormModule {}
