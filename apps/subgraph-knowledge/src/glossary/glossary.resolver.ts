/**
 * GlossaryResolver — queries and mutations for GlossaryEntry.
 * Field resolvers live in glossary-fields.resolver.ts.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger, UnauthorizedException } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware.js';
import { GlossaryService } from './glossary.service.js';
import { GlossaryAggregationService } from './glossary-aggregation.service.js';

@Resolver('GlossaryEntry')
export class GlossaryResolver {
  private readonly logger = new Logger(GlossaryResolver.name);

  constructor(
    private readonly glossaryService: GlossaryService,
    private readonly aggregationService: GlossaryAggregationService
  ) {}

  private auth(ctx: GraphQLContext) {
    if (!ctx.authContext?.tenantId)
      throw new UnauthorizedException('Auth required');
    return { tenantId: ctx.authContext.tenantId };
  }

  private toGQL(entry: ReturnType<typeof Object.assign>, tenantId: string) {
    return {
      id: (entry as { id: string }).id,
      termId: (entry as { term_id: string }).term_id,
      tenantId,
      wikiContent:
        (entry as { wiki_content?: string | null }).wiki_content ?? null,
      aggregatedDefinition:
        (entry as { aggregated_definition?: string | null })
          .aggregated_definition ?? null,
      isPublished: (entry as { is_published: boolean }).is_published,
    };
  }

  @Query()
  async glossaryEntry(
    @Args('termId') termId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.toGQL(
      await this.glossaryService.getByTermId(tenantId, termId),
      tenantId
    );
  }

  @Query()
  async glossaryEntries(
    @Args('domainId') domainId: string,
    @Args('limit') limit: number | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const entries = await this.glossaryService.getByDomainId(
      tenantId,
      domainId,
      limit ?? 50
    );
    return entries.map((e) => this.toGQL(e, tenantId));
  }

  @Query()
  async glossarySearch(
    @Args('query') query: string,
    @Args('limit') limit: number | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const entries = await this.glossaryService.search(
      tenantId,
      query,
      limit ?? 20
    );
    return entries.map((e) => this.toGQL(e, tenantId));
  }

  @Mutation()
  async updateGlossaryWiki(
    @Args('termId') termId: string,
    @Args('wikiContent') wikiContent: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const entry = await this.glossaryService.updateWiki(
      tenantId,
      termId,
      wikiContent
    );
    this.logger.log({ tenantId, termId }, 'Wiki updated');
    return this.toGQL(entry, tenantId);
  }

  @Mutation()
  async publishGlossaryEntry(
    @Args('termId') termId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const entry = await this.glossaryService.publish(tenantId, termId);
    this.logger.log({ tenantId, termId }, 'Glossary entry published');
    return this.toGQL(entry, tenantId);
  }

  @Mutation()
  async aggregateGlossaryDefinition(
    @Args('termId') termId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    await this.aggregationService.updateLessonRefs(tenantId, termId);
    const entry = await this.aggregationService.aggregateDefinition(
      tenantId,
      termId
    );
    return this.toGQL(entry, tenantId);
  }
}
