import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { GraphService } from './graph.service';
import type { GraphQLContext } from '../auth/auth.middleware';

const tracer = trace.getTracer('subgraph-knowledge');

@Resolver()
export class GraphResolver {
  private readonly logger = new Logger(GraphResolver.name);

  constructor(private readonly graphService: GraphService) {}

  private getAuthContext(context: GraphQLContext) {
    if (
      !context.authContext ||
      !context.authContext.userId ||
      !context.authContext.tenantId
    ) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: context.authContext.tenantId,
      userId: context.authContext.userId,
      role: context.authContext.roles[0] || 'STUDENT',
    };
  }

  @Query()
  async concept(@Args('id') id: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findConceptById(id, tenantId, userId, role);
  }

  @Query()
  async conceptByName(
    @Args('name') name: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findConceptByName(name, tenantId, userId, role);
  }

  @Query()
  async concepts(
    @Args('limit') limit: number = 20,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findAllConcepts(tenantId, userId, role, limit);
  }

  @Query()
  async relatedConcepts(
    @Args('conceptId') conceptId: string,
    @Args('depth') depth: number = 2,
    @Args('limit') limit: number = 10,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findRelatedConcepts(
      conceptId,
      depth,
      limit,
      tenantId,
      userId,
      role
    );
  }

  @Query()
  async person(@Args('id') id: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findPersonById(id, tenantId, userId, role);
  }

  @Query()
  async personByName(
    @Args('name') name: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findPersonByName(name, tenantId, userId, role);
  }

  @Query()
  async term(@Args('id') id: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findTermById(id, tenantId, userId, role);
  }

  @Query()
  async termByName(
    @Args('name') name: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findTermByName(name, tenantId, userId, role);
  }

  @Query()
  async source(@Args('id') id: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findSourceById(id, tenantId, userId, role);
  }

  @Query()
  async topicCluster(
    @Args('id') id: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findTopicClusterById(id, tenantId, userId, role);
  }

  @Query()
  async topicClustersByCourse(
    @Args('courseId') courseId: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.findTopicClustersByCourse(
      courseId,
      tenantId,
      userId,
      role
    );
  }

  @Query()
  async searchSemantic(
    @Args('query') query: string,
    @Args('limit') limit: number = 10,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);

    const span = tracer.startSpan('knowledge.semanticSearch', {
      attributes: {
        'search.query.length': query.length,
        'search.limit': limit,
        'tenant.id': tenantId,
        'user.id': userId,
      },
    });

    try {
      const results = await this.graphService.semanticSearch(
        query,
        limit,
        tenantId,
        userId,
        role
      );
      span.setAttribute(
        'search.results.count',
        Array.isArray(results) ? results.length : 0
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return results;
    } catch (err) {
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  }

  @Mutation()
  async createConcept(
    @Args('input') input: any,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.createConcept(
      input.name,
      input.definition,
      input.sourceIds || [],
      tenantId,
      userId,
      role
    );
  }

  @Mutation()
  async updateConcept(
    @Args('id') id: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.updateConcept(id, input, tenantId, userId, role);
  }

  @Mutation()
  async deleteConcept(
    @Args('id') id: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.deleteConcept(id, tenantId, userId, role);
  }

  @Mutation()
  async linkConcepts(
    @Args('fromId') fromId: string,
    @Args('toId') toId: string,
    @Args('relationshipType') relationshipType: string,
    @Args('strength') strength: number | null,
    @Args('description') description: string | null,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.linkConcepts(
      fromId,
      toId,
      relationshipType,
      strength,
      description,
      tenantId,
      userId,
      role
    );
  }

  @Mutation()
  async createPerson(
    @Args('input') input: any,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.createPerson(
      input.name,
      input.bio || null,
      tenantId,
      userId,
      role
    );
  }

  @Mutation()
  async createTerm(
    @Args('input') input: any,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.createTerm(
      input.name,
      input.definition,
      tenantId,
      userId,
      role
    );
  }

  @Mutation()
  async createSource(
    @Args('input') input: any,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.createSource(
      input.title,
      input.type,
      input.url || null,
      tenantId,
      userId,
      role
    );
  }

  @Mutation()
  async createTopicCluster(
    @Args('input') input: any,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.createTopicCluster(
      input.name,
      input.description || null,
      tenantId,
      userId,
      role
    );
  }

  @Mutation()
  async generateEmbedding(
    @Args('text') text: string,
    @Args('entityType') entityType: string,
    @Args('entityId') entityId: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.graphService.generateEmbedding(
      text,
      entityType,
      entityId,
      tenantId,
      userId,
      role
    );
  }

  // ─── Learning Path queries ────────────────────────────────────────────────

  @Query()
  async learningPath(
    @Args('from') from: string,
    @Args('to') to: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    this.logger.debug({ from, to }, 'learningPath query');
    return this.graphService.getLearningPath(from, to, tenantId, userId, role);
  }

  @Query()
  async relatedConceptsByName(
    @Args('conceptName') conceptName: string,
    @Args('depth') depth: number = 2,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    this.logger.debug({ conceptName, depth }, 'relatedConceptsByName query');
    return this.graphService.getRelatedConceptsByName(
      conceptName,
      depth,
      tenantId,
      userId,
      role
    );
  }

  @Query()
  async prerequisiteChain(
    @Args('conceptName') conceptName: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    this.logger.debug({ conceptName }, 'prerequisiteChain query');
    return this.graphService.getPrerequisiteChain(
      conceptName,
      tenantId,
      userId,
      role
    );
  }
}
