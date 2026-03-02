import type { IncomingMessage } from 'http';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { LoggerModule } from 'nestjs-pino';
import { CourseModule } from './course/course.module';
import { ModuleModule } from './module/module.module';
import { MediaModule } from './media/media.module';
import { ContentItemModule } from './content-item/content-item.module';
import { MetricsModule } from './metrics/metrics.module';
import { authMiddleware } from './auth/auth.middleware';
import { TranslationModule } from './translation/translation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LiveSessionModule } from './live-session/live-session.module';
import { QuizModule } from './quiz/quiz.module';
import { ComplianceModule } from './compliance/compliance.module';
import { MicrolearningModule } from './microlearning/microlearning.module';
import { PlagiarismModule } from './plagiarism/plagiarism.module';
import { AtRiskModule } from './at-risk/at-risk.module';
import { ScenarioModule } from './scenario/scenario.module';
import { LtiModule } from './lti/lti.module';
import { BiExportModule } from './bi-export/bi-export.module';
import { CpdModule } from './cpd/cpd.module';
import { XapiModule } from './xapi/xapi.module';
import { ProgramModule } from './programs/program.module';
import { AssessmentModule } from './assessment/assessment.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { OpenBadgeModule } from './open-badges/open-badge.module';
import { LibraryModule } from './course-library/library.module';
import { LessonModule } from './lesson/lesson.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true },
              }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        customProps: (req: IncomingMessage) => ({
          tenantId: req.headers['x-tenant-id'],
          requestId: req.headers['x-request-id'],
        }),
      },
    }),
    MetricsModule,
    GraphQLModule.forRoot({
      driver: YogaFederationDriver,
      typePaths: ['./**/*.graphql'],
      context: async ({ req }: { req: IncomingMessage }) => {
        const ctx = { req };
        await authMiddleware.validateRequest(ctx);
        return ctx;
      },
      playground: true,
      introspection: true,
    }),
    CourseModule,
    ModuleModule,
    MediaModule,
    ContentItemModule,
    TranslationModule,
    AnalyticsModule,
    LiveSessionModule,
    QuizModule,
    ComplianceModule,
    MicrolearningModule,
    PlagiarismModule,
    AtRiskModule,
    ScenarioModule,
    LtiModule,
    BiExportModule,
    CpdModule,
    XapiModule,
    ProgramModule,
    AssessmentModule,
    MarketplaceModule,
    OpenBadgeModule,
    LibraryModule,
    LessonModule,
  ],
})
export class AppModule {}
