/**
 * RoleplayResolver — GraphQL resolvers for F-007 role-play scenarios.
 * Delegates to RoleplayService (catalog) and RoleplaySessionService (sessions).
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { RoleplayService } from './roleplay.service.js';
import { RoleplaySessionService } from './roleplay-session.service.js';
import type { EvaluationResult, RubricCriterion } from '@edusphere/db';

interface GqlContext {
  req: {
    user?: { sub?: string; userId?: string };
    headers: Record<string, string | undefined>;
  };
}

function getUserId(ctx: GqlContext): string {
  return ctx.req.user?.sub ?? ctx.req.user?.userId ?? '';
}

function getTenantId(ctx: GqlContext): string {
  return ctx.req.headers['x-tenant-id'] ?? '';
}

@Resolver()
export class RoleplayResolver {
  private readonly logger = new Logger(RoleplayResolver.name);

  constructor(
    private readonly roleplayService: RoleplayService,
    private readonly sessionService: RoleplaySessionService,
  ) {}

  @Query('scenarioTemplates')
  async scenarioTemplates(@Context() ctx: GqlContext) {
    const tenantId = getTenantId(ctx);
    const rows = await this.roleplayService.listScenarios(tenantId);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      domain: r.domain,
      difficultyLevel: r.difficulty_level,
      sceneDescription: r.scene_description,
      maxTurns: r.max_turns,
      isBuiltin: r.is_builtin,
    }));
  }

  @Query('myScenarioSession')
  async myScenarioSession(@Args('sessionId') sessionId: string, @Context() ctx: GqlContext) {
    const userId = getUserId(ctx);
    const tenantId = getTenantId(ctx);
    const session = await this.sessionService.getSession(sessionId, userId, tenantId);
    if (!session) return null;
    return this.mapSession(session);
  }

  @Mutation('startRoleplaySession')
  async startRoleplaySession(@Args('scenarioId') scenarioId: string, @Context() ctx: GqlContext) {
    const userId = getUserId(ctx);
    const tenantId = getTenantId(ctx);
    const session = await this.sessionService.startSession(scenarioId, userId, tenantId);
    this.logger.log({ sessionId: session.id }, 'Roleplay session started via resolver');
    return this.mapSession(session);
  }

  @Mutation('sendRoleplayMessage')
  async sendRoleplayMessage(
    @Args('sessionId') sessionId: string,
    @Args('message') message: string,
    @Context() ctx: GqlContext,
  ) {
    const userId = getUserId(ctx);
    const tenantId = getTenantId(ctx);
    return this.sessionService.sendMessage(sessionId, message, userId, tenantId);
  }

  @Mutation('createScenarioTemplate')
  async createScenarioTemplate(
    @Args('title') title: string,
    @Args('domain') domain: string,
    @Args('difficultyLevel') difficultyLevel: string,
    @Args('characterPersona') characterPersona: string,
    @Args('sceneDescription') sceneDescription: string,
    @Args('maxTurns') maxTurns: number | undefined,
    @Context() ctx: GqlContext,
  ) {
    const userId = getUserId(ctx);
    const tenantId = getTenantId(ctx);
    const row = await this.roleplayService.createScenario(tenantId, userId, {
      title,
      domain,
      difficulty_level: difficultyLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
      character_persona: characterPersona,
      scene_description: sceneDescription,
      evaluation_rubric: [] as RubricCriterion[],
      max_turns: maxTurns ?? 10,
    });
    return {
      id: row.id, title: row.title, domain: row.domain,
      difficultyLevel: row.difficulty_level,
      sceneDescription: row.scene_description,
      maxTurns: row.max_turns, isBuiltin: row.is_builtin,
    };
  }

  private mapSession(session: {
    id: string; scenario_id: string; status: string; turn_count: number;
    evaluation_result: unknown; started_at: Date; completed_at: Date | null;
  }) {
    const evalRaw = session.evaluation_result as EvaluationResult | null;
    return {
      id: session.id, scenarioId: session.scenario_id, status: session.status,
      turnCount: session.turn_count, startedAt: session.started_at,
      completedAt: session.completed_at,
      evaluation: evalRaw ? {
        overallScore: evalRaw.overallScore,
        criteriaScores: evalRaw.criteriaScores,
        strengths: evalRaw.strengths,
        areasForImprovement: evalRaw.areasForImprovement,
        summary: evalRaw.summary,
      } : null,
    };
  }
}
