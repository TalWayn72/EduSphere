/**
 * GraphQL query resolvers for the knowledge graph.
 * Extracted from GraphResolver for file-size compliance.
 */
import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { GraphService } from './graph.service';
import { getGraphAuthContext, type GraphQLContext } from './graph-resolver.helpers.js';

const tracer = trace.getTracer('subgraph-knowledge');

@Resolver()
export class GraphQueryResolver {
  private readonly logger = new Logger(GraphQueryResolver.name);

  constructor(private readonly graphService: GraphService) {}

  @Query()
  async concept(@Args('id') id: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findConceptById(id, tenantId, userId, role);
  }

  @Query()
  async conceptByName(@Args('name') name: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findConceptByName(name, tenantId, userId, role);
  }

  @Query()
  async concepts(@Args('limit') limit: number = 20, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findAllConcepts(tenantId, userId, role, limit);
  }

  @Query()
  async relatedConcepts(
    @Args('conceptId') conceptId: string,
    @Args('depth') depth: number = 2,
    @Args('limit') limit: number = 10,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findRelatedConcepts(conceptId, depth, limit, tenantId, userId, role);
  }

  @Query()
  async person(@Args('id') id: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findPersonById(id, tenantId, userId, role);
  }

  @Query()
  async personByName(@Args('name') name: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findPersonByName(name, tenantId, userId, role);
  }

  @Query()
  async term(@Args('id') id: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findTermById(id, tenantId, userId, role);
  }

  @Query()
  async termByName(@Args('name') name: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findTermByName(name, tenantId, userId, role);
  }

  @Query()
  async source(@Args('id') id: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findSourceById(id, tenantId, userId, role);
  }

  @Query()
  async topicCluster(@Args('id') id: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findTopicClusterById(id, tenantId, userId, role);
  }

  @Query()
  async topicClustersByCourse(@Args('courseId') courseId: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.findTopicClustersByCourse(courseId, tenantId, userId, role);
  }

  @Query()
  async searchSemantic(
    @Args('query') query: string,
    @Args('limit') limit: number = 10,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    const span = tracer.startSpan('knowledge.semanticSearch', {
      attributes: {
        'search.query.length': query.length, 'search.limit': limit,
        'tenant.id': tenantId, 'user.id': userId,
      },
    });
    try {
      const results = await this.graphService.semanticSearch(query, limit, tenantId, userId, role);
      span.setAttribute('search.results.count', Array.isArray(results) ? results.length : 0);
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

  @Query()
  async learningPath(@Args('from') from: string, @Args('to') to: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    this.logger.debug({ from, to }, 'learningPath query');
    return this.graphService.getLearningPath(from, to, tenantId, userId, role);
  }

  @Query()
  async relatedConceptsByName(
    @Args('conceptName') conceptName: string,
    @Args('depth') depth: number = 2,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    this.logger.debug({ conceptName, depth }, 'relatedConceptsByName query');
    return this.graphService.getRelatedConceptsByName(conceptName, depth, tenantId, userId, role);
  }

  @Query()
  async prerequisiteChain(@Args('conceptName') conceptName: string, @Context() context: GraphQLContext) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    this.logger.debug({ conceptName }, 'prerequisiteChain query');
    return this.graphService.getPrerequisiteChain(conceptName, tenantId, userId, role);
  }
}
