import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ExamItemService } from './exam-item.service';
import { ExamBlueprintService } from './exam-blueprint.service';
import { ExamAssemblyService } from './exam-assembly.service';
import { ExamItemResolver } from './exam-item.resolver';
import { ExamBlueprintResolver } from './exam-blueprint.resolver';
import { ExamDeliveryService } from './exam-delivery.service';
import { ExamDeliveryTimerService } from './exam-delivery-timer.service';
import { ExamGradingService } from './exam-grading.service';
import { ExamResultQueryService } from './exam-result-query.service';
import { ExamSessionResolver } from './exam-session.resolver';
import { ExamResultResolver } from './exam-result.resolver';
import { CatEngineService } from './cat-engine.service';
import { ExamSecurityService } from './exam-security.service';
import { ExamItemGeneratorService } from './exam-item-generator.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    ExamItemService,
    ExamBlueprintService,
    ExamAssemblyService,
    ExamGradingService,
    ExamDeliveryService,
    ExamDeliveryTimerService,
    ExamResultQueryService,
    CatEngineService,
    ExamSecurityService,
    ExamItemGeneratorService,
    ExamItemResolver,
    ExamBlueprintResolver,
    ExamSessionResolver,
    ExamResultResolver,
  ],
  exports: [
    ExamItemService,
    ExamBlueprintService,
    ExamAssemblyService,
    ExamGradingService,
    ExamDeliveryService,
    ExamResultQueryService,
    CatEngineService,
    ExamSecurityService,
  ],
})
export class ExamModule {}
