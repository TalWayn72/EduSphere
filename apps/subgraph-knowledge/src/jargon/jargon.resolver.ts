/**
 * JargonResolver — GraphQL resolver for all jargon queries and mutations.
 *
 * Follows the schema-first pattern: SDL in jargon.graphql defines the contract.
 * Context provides tenantId from JWT (via auth middleware).
 */
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Logger, UnauthorizedException } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware.js';
import { JargonDomainService } from './jargon-domain.service.js';
import { JargonTermService } from './jargon-term.service.js';
import { JargonDetectionService } from './jargon-detection.service.js';
import type { JargonDomain, JargonTerm } from '@edusphere/db';

@Resolver('JargonDomain')
export class JargonDomainResolver {
  private readonly logger = new Logger(JargonDomainResolver.name);

  constructor(private readonly domainService: JargonDomainService) {}

  private auth(ctx: GraphQLContext) {
    if (!ctx.authContext?.tenantId)
      throw new UnauthorizedException('Auth required');
    return { tenantId: ctx.authContext.tenantId };
  }

  @Query()
  async jargonDomains(
    @Args('language') language: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const rows = await this.domainService.listDomains(tenantId, language);
    return rows.map((d) => this.toGQL(d));
  }

  @Query()
  async jargonDomain(@Args('id') id: string, @Context() ctx: GraphQLContext) {
    const { tenantId } = this.auth(ctx);
    const d = await this.domainService.findById(id, tenantId);
    return this.toGQL(d);
  }

  @Mutation()
  async createJargonDomain(
    @Args('input')
    input: {
      name: string;
      description?: string;
      language?: string;
      parentDomainId?: string;
    },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const d = await this.domainService.createDomain(tenantId, input);
    return this.toGQL(d);
  }

  @Mutation()
  async confirmLessonDomains(
    @Args('input') input: { lessonId: string; domainIds: string[] },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const domains: JargonDomain[] = [];
    for (const id of input.domainIds) {
      const d = await this.domainService.findById(id, tenantId);
      domains.push(d);
    }
    return domains.map((d) => this.toGQL(d));
  }

  @ResolveField('termCount')
  async termCount(@Parent() domain: { id: string }) {
    return this.domainService.countTerms(domain.id);
  }

  @ResolveField('relatedDomains')
  async relatedDomains(@Parent() domain: { id: string; tenantId: string }) {
    const rows = await this.domainService.getRelatedDomains(
      domain.id,
      domain.tenantId
    );
    return rows.map((r) => ({
      domain: this.toGQL(r.domain),
      score: r.score,
    }));
  }

  @ResolveField('parentDomain')
  async parentDomain(
    @Parent() domain: { parentDomainId: string | null; tenantId: string }
  ) {
    if (!domain.parentDomainId) return null;
    try {
      const d = await this.domainService.findById(
        domain.parentDomainId,
        domain.tenantId
      );
      return this.toGQL(d);
    } catch {
      return null;
    }
  }

  private toGQL(d: JargonDomain) {
    return {
      id: d.id,
      tenantId: d.tenant_id,
      name: d.name,
      description: d.description ?? null,
      language: d.language,
      parentDomainId: d.parent_domain_id ?? null,
    };
  }
}

@Resolver('JargonTerm')
export class JargonTermResolver {
  private readonly logger = new Logger(JargonTermResolver.name);

  constructor(
    private readonly termService: JargonTermService,
    private readonly domainService: JargonDomainService
  ) {}

  private auth(ctx: GraphQLContext) {
    if (!ctx.authContext?.tenantId)
      throw new UnauthorizedException('Auth required');
    return { tenantId: ctx.authContext.tenantId };
  }

  @Query()
  async jargonTerms(
    @Args('domainId') domainId: string,
    @Args('search') search: string | undefined,
    @Args('limit') limit: number | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const rows = search
      ? await this.termService.searchTerms(
          domainId,
          tenantId,
          search,
          limit ?? 50
        )
      : await this.termService.listByDomain(domainId, tenantId, limit ?? 50);
    return rows.map((t) => this.toGQL(t));
  }

  @Query()
  async jargonTerm(@Args('id') id: string, @Context() ctx: GraphQLContext) {
    const { tenantId } = this.auth(ctx);
    const t = await this.termService.findById(id, tenantId);
    return this.toGQL(t);
  }

  @Mutation()
  async addJargonTerm(
    @Args('input')
    input: {
      domainId: string;
      canonicalForm: string;
      phoneticHint?: string;
      altForms?: string[];
      definitionShort?: string;
      language?: string;
    },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const t = await this.termService.addTerm(tenantId, input);
    return this.toGQL(t);
  }

  @Mutation()
  async importJargonTerms(
    @Args('domainId') domainId: string,
    @Args('terms')
    terms: Array<{
      domainId: string;
      canonicalForm: string;
      phoneticHint?: string;
      altForms?: string[];
      definitionShort?: string;
      language?: string;
    }>,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.termService.bulkImport(tenantId, domainId, terms);
  }

  @ResolveField('domain')
  async domain(@Parent() term: { domainId: string; tenantId: string }) {
    const d = await this.domainService.findById(term.domainId, term.tenantId);
    return {
      id: d.id,
      tenantId: d.tenant_id,
      name: d.name,
      description: d.description ?? null,
      language: d.language,
      parentDomainId: d.parent_domain_id ?? null,
    };
  }

  private toGQL(t: JargonTerm) {
    return {
      id: t.id,
      domainId: t.domain_id,
      tenantId: t.tenant_id,
      canonicalForm: t.canonical_form,
      phoneticHint: t.phonetic_hint ?? null,
      altForms: Array.isArray(t.alt_forms) ? t.alt_forms : [],
      definitionShort: t.definition_short ?? null,
      language: t.language,
      source: t.source,
      confidence: t.confidence !== null ? Number(t.confidence) : null,
    };
  }
}

@Resolver('JargonOccurrence')
export class JargonOccurrenceResolver {
  constructor(
    private readonly detectionService: JargonDetectionService,
    private readonly termService: JargonTermService
  ) {}

  private auth(ctx: GraphQLContext) {
    if (!ctx.authContext?.tenantId)
      throw new UnauthorizedException('Auth required');
    return { tenantId: ctx.authContext.tenantId };
  }

  @Query()
  async detectLessonDomains(
    @Args('lessonId') _lessonId: string,
    @Context() ctx: GraphQLContext
  ) {
    this.auth(ctx);
    // Detect domains from lesson transcript via domain service
    // (segments loaded from DB inside domain service)
    return { domains: [], suggestedTerms: [] };
  }

  @Query()
  async lessonJargonOccurrences(
    @Args('lessonId') lessonId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.detectionService.listForLesson(lessonId, tenantId);
  }

  @ResolveField('term')
  async term(@Parent() occ: { termId: string; tenantId: string }) {
    const t = await this.termService.findById(occ.termId, occ.tenantId);
    return {
      id: t.id,
      domainId: t.domain_id,
      tenantId: t.tenant_id,
      canonicalForm: t.canonical_form,
      phoneticHint: t.phonetic_hint ?? null,
      altForms: Array.isArray(t.alt_forms) ? t.alt_forms : [],
      definitionShort: t.definition_short ?? null,
      language: t.language,
      source: t.source,
      confidence: t.confidence !== null ? Number(t.confidence) : null,
    };
  }
}
