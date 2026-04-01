/**
 * GraphQL mutation resolvers for the knowledge graph.
 * Query resolvers are in GraphQueryResolver (split for file-size compliance).
 */
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { GraphService } from './graph.service';
import { TopicClusterKMeansService } from './topic-cluster-kmeans.service';
import { MergeConceptsService } from './merge-concepts.service';
import { MergeConceptsInputSchema } from './merge-concepts.schemas';
import {
  getGraphAuthContext,
  assertRelationshipType,
  type GraphQLContext,
  type CreateConceptInput,
  type UpdateConceptInput,
  type CreatePersonInput,
  type CreateTermInput,
  type CreateSourceInput,
  type CreateTopicClusterInput,
} from './graph-resolver.helpers.js';

@Resolver()
export class GraphResolver {
  private readonly logger = new Logger(GraphResolver.name);

  constructor(
    private readonly graphService: GraphService,
    private readonly kMeansService: TopicClusterKMeansService,
    private readonly mergeConceptsService: MergeConceptsService
  ) {}

  @Mutation()
  async createConcept(
    @Args('input') input: CreateConceptInput,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
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
    @Args('input') input: UpdateConceptInput,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.updateConcept(id, input, tenantId, userId, role);
  }

  @Mutation()
  async deleteConcept(
    @Args('id') id: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
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
    const { tenantId, userId, role } = getGraphAuthContext(context);
    const validatedType = assertRelationshipType(relationshipType);
    return this.graphService.linkConcepts(
      fromId,
      toId,
      validatedType,
      strength,
      description,
      tenantId,
      userId,
      role
    );
  }

  @Mutation()
  async createPerson(
    @Args('input') input: CreatePersonInput,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
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
    @Args('input') input: CreateTermInput,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
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
    @Args('input') input: CreateSourceInput,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
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
    @Args('input') input: CreateTopicClusterInput,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = getGraphAuthContext(context);
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
    const { tenantId, userId, role } = getGraphAuthContext(context);
    return this.graphService.generateEmbedding(
      text,
      entityType,
      entityId,
      tenantId,
      userId,
      role
    );
  }

  @Mutation()
  async clusterTopics(
    @Args('courseId') courseId: string,
    @Args('k') k: number,
    @Context() context: GraphQLContext
  ) {
    const { tenantId } = getGraphAuthContext(context);
    this.logger.log({ courseId, k }, '[GraphResolver] clusterTopics mutation');
    return this.kMeansService.clusterConceptsByCourse(
      courseId,
      k ?? 5,
      tenantId
    );
  }

  @Mutation()
  async mergeConceptGraphNodes(
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    const { tenantId } = getGraphAuthContext(context);
    const validated = MergeConceptsInputSchema.parse(input);
    this.logger.log(
      { input: validated, tenantId },
      '[GraphResolver] mergeConceptGraphNodes mutation'
    );
    return this.mergeConceptsService.mergeNodes(validated, tenantId);
  }
}
