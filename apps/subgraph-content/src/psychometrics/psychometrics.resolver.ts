/**
 * PsychometricsResolver — thin GraphQL resolver layer
 *
 * Queries: examItemStatistics, examReliabilityReport
 * Mutation: calibrateExamItems (batch IRT calibration)
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger, OnModuleDestroy } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware';
import type { TenantContext } from '@edusphere/db';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import { ClassicalAnalysisService } from './classical-analysis.service.js';
import { IRTCalibrationService } from './irt-calibration.service.js';
import { TestReliabilityService } from './test-reliability.service.js';

function sysCtx(tenantId: string): TenantContext {
  return { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
}

@Resolver()
export class PsychometricsResolver implements OnModuleDestroy {
  private readonly logger = new Logger(PsychometricsResolver.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly classicalService: ClassicalAnalysisService,
    private readonly irtService: IRTCalibrationService,
    private readonly reliabilityService: TestReliabilityService
  ) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('PsychometricsResolver destroyed — connections closed');
  }

  @Query('examItemStatistics')
  async examItemStatistics(
    @Args('itemId') itemId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.extractAuth(ctx);
    const stats = await this.classicalService.analyzeItem(itemId, tenantId);
    const distractors = await this.classicalService.analyzeDistractors(
      itemId,
      tenantId
    );

    const dbCtx = sysCtx(tenantId);
    const [item] = await withTenantContext(this.db, dbCtx, (tx) =>
      tx
        .select({
          irtA: schema.examItems.irtA,
          irtB: schema.examItems.irtB,
          irtC: schema.examItems.irtC,
        })
        .from(schema.examItems)
        .where(eq(schema.examItems.id, itemId))
    );

    return {
      itemId: stats.itemId,
      totalAdministrations: stats.totalResponses,
      pValue: stats.pValue,
      rpbis: stats.rpbis,
      dIndex: stats.dIndex,
      distractorAnalysis: distractors.distractors,
      irtA: item?.irtA ?? null,
      irtB: item?.irtB ?? null,
      irtC: item?.irtC ?? null,
    };
  }

  @Query('examReliabilityReport')
  async examReliabilityReport(
    @Args('blueprintId') blueprintId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.extractAuth(ctx);
    return this.reliabilityService.getReliabilityReport(blueprintId, tenantId);
  }

  @Mutation('calibrateExamItems')
  async calibrateExamItems(
    @Args('blueprintId') blueprintId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.extractAuth(ctx);
    const dbCtx = sysCtx(tenantId);

    const [blueprint] = await withTenantContext(this.db, dbCtx, (tx) =>
      tx
        .select({ courseId: schema.examBlueprints.courseId })
        .from(schema.examBlueprints)
        .where(eq(schema.examBlueprints.id, blueprintId))
    );

    if (!blueprint) {
      this.logger.warn(
        { blueprintId },
        '[PsychometricsResolver] Blueprint not found'
      );
      return false;
    }

    const items = await withTenantContext(this.db, dbCtx, (tx) =>
      tx
        .select({ id: schema.examItems.id })
        .from(schema.examItems)
        .where(
          and(
            eq(schema.examItems.courseId, blueprint.courseId),
            eq(schema.examItems.tenantId, tenantId)
          )
        )
    );

    let calibrated = 0;
    for (const item of items) {
      const result = await this.irtService.calibrateItem(item.id, tenantId);
      if (result) calibrated++;
    }

    this.logger.log(
      { blueprintId, tenantId, calibrated, total: items.length },
      '[PsychometricsResolver] Batch calibration complete'
    );

    return calibrated > 0;
  }

  private extractAuth(ctx: GraphQLContext): {
    tenantId: string;
    userId: string;
    role: TenantContext['userRole'];
  } {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: auth.tenantId,
      userId: auth.userId,
      role: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
    };
  }
}
