/**
 * XapiResolver — thin GraphQL resolver for xAPI token management and statement queries.
 * All business logic delegated to XapiTokenService and XapiStatementService.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { XapiTokenService } from './xapi-token.service.js';
import { XapiStatementService } from './xapi-statement.service.js';
import { XapiExportService } from './xapi-export.service.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';

@Resolver()
export class XapiResolver {
  private readonly logger = new Logger(XapiResolver.name);

  constructor(
    private readonly tokenService: XapiTokenService,
    private readonly statementService: XapiStatementService,
    private readonly exportService: XapiExportService
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
    @Args('olderThanDays') _olderThanDays: number,
    @Context() ctx: GraphQLContext
  ): Promise<number> {
    const auth = ctx.authContext;
    if (!auth?.tenantId)
      throw new UnauthorizedException('Authentication required');
    this.logger.log(
      { tenantId: auth.tenantId, olderThanDays: _olderThanDays },
      'clearXapiStatements'
    );
    // TODO: implement bulk delete in XapiStatementService (Phase 41 B-series)
    return 0;
  }
}
