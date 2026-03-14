/**
 * XapiResolver — thin GraphQL resolver for xAPI token management and statement queries.
 * All business logic delegated to XapiTokenService and XapiStatementService.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  createDatabaseConnection,
  schema,
  withTenantContext,
  eq,
  and,
  lt,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { XapiTokenService } from './xapi-token.service.js';
import { XapiStatementService } from './xapi-statement.service.js';
import { XapiExportService } from './xapi-export.service.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';

const clearStatementsSchema = z.object({
  olderThanDays: z.number().int().min(0).max(3650),
});

@Resolver()
export class XapiResolver {
  private readonly logger = new Logger(XapiResolver.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly tokenService: XapiTokenService,
    private readonly statementService: XapiStatementService,
    private readonly exportService: XapiExportService,
  ) {}

  @Query('xapiTokens')
  async xapiTokens(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.tenantId)
      throw new UnauthorizedException('Authentication required');
    return this.tokenService.listTokens(auth.tenantId);
  }

  @Query('xapiStatements')
  async xapiStatements(
    @Args('limit') limit: number | undefined,
    @Args('since') since: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.tenantId)
      throw new UnauthorizedException('Authentication required');
    const statements = await this.statementService.queryStatements(
      auth.tenantId,
      { limit, since }
    );
    return statements.map((s) => ({
      id: s.id,
      verb: s.verb.id,
      objectId: s.object.id,
      storedAt: s.stored ?? new Date().toISOString(),
    }));
  }

  @Mutation('generateXapiToken')
  async generateXapiToken(
    @Args('description') description: string,
    @Args('lrsEndpoint') lrsEndpoint: string | undefined,
    @Context() ctx: GraphQLContext
  ): Promise<string> {
    const auth = ctx.authContext;
    if (!auth?.tenantId)
      throw new UnauthorizedException('Authentication required');
    this.logger.log(
      { tenantId: auth.tenantId, description },
      'generateXapiToken'
    );
    return this.tokenService.generateToken(
      auth.tenantId,
      description,
      lrsEndpoint
    );
  }

  @Mutation('revokeXapiToken')
  async revokeXapiToken(
    @Args('tokenId') tokenId: string,
    @Context() ctx: GraphQLContext
  ): Promise<boolean> {
    const auth = ctx.authContext;
    if (!auth?.tenantId)
      throw new UnauthorizedException('Authentication required');
    this.logger.log({ tenantId: auth.tenantId, tokenId }, 'revokeXapiToken');
    return this.tokenService.revokeToken(tokenId, auth.tenantId);
  }

  @Query('xapiStatementCount')
  async xapiStatementCount(
    @Args('since') since: string | undefined,
    @Context() ctx: GraphQLContext
  ): Promise<number> {
    const auth = ctx.authContext;
    if (!auth?.tenantId)
      throw new UnauthorizedException('Authentication required');
    return this.exportService.getStatementCount(auth.tenantId, since);
  }

  @Mutation('clearXapiStatements')
  async clearXapiStatements(
    @Args('olderThanDays') olderThanDays: number,
    @Context() ctx: GraphQLContext,
  ): Promise<number> {
    const auth = ctx.authContext;
    if (!auth?.tenantId)
      throw new UnauthorizedException('Authentication required');

    const parsed = clearStatementsSchema.safeParse({ olderThanDays });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const tenantId = auth.tenantId;
    const userId = auth.userId ?? 'unknown';
    this.logger.log({ tenantId, userId, olderThanDays }, 'clearXapiStatements');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const tenantCtx: TenantContext = { tenantId, userId, userRole: 'SUPER_ADMIN' };
    const deleted = await withTenantContext(this.db, tenantCtx, async (tx) => {
      const conditions = [eq(schema.xapiStatements.tenantId, tenantId)];
      if (olderThanDays > 0) {
        conditions.push(lt(schema.xapiStatements.storedAt, cutoffDate));
      }
      const result = await tx
        .delete(schema.xapiStatements)
        .where(and(...conditions))
        .returning({ id: schema.xapiStatements.id });
      return result.length;
    });

    // Audit log entry for compliance
    await withTenantContext(this.db, tenantCtx, async (tx) =>
      tx.insert(schema.auditLog).values({
        tenantId,
        userId,
        action: 'XAPI_STATEMENTS_CLEARED',
        resourceType: 'xapi_statements',
        metadata: { olderThanDays, deletedCount: deleted, cutoffDate: cutoffDate.toISOString() },
      }),
    );

    this.logger.log({ tenantId, deleted, olderThanDays }, 'xAPI statements cleared');
    return deleted;
  }
}
