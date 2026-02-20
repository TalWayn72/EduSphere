import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  ResolveReference,
  Context,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { createPubSub } from 'graphql-yoga';
import { AnnotationService } from './annotation.service';
import {
  CreateAnnotationInputSchema,
  UpdateAnnotationInputSchema,
} from './annotation.schemas';
import type { AuthContext } from '@edusphere/auth';

const tracer = trace.getTracer('subgraph-annotation');

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

const pubSub = createPubSub<{
  [key: `annotationAdded_${string}`]: [{ annotationAdded: unknown }];
}>();

@Resolver('Annotation')
export class AnnotationResolver {
  private readonly logger = new Logger(AnnotationResolver.name);

  constructor(private readonly annotationService: AnnotationService) {}

  @Query('_health')
  health(): string {
    return 'ok';
  }

  @Query('annotation')
  async getAnnotation(
    @Args('id') id: string,
    @Context() context: GraphQLContext
  ) {
    return this.annotationService.findById(id, context.authContext);
  }

  @Query('annotations')
  async getAnnotations(
    @Args('assetId') assetId: string | undefined,
    @Args('userId') userId: string | undefined,
    @Args('layer') layer: string | undefined,
    @Args('limit') limit: number = 20,
    @Args('offset') offset: number = 0,
    @Context() context: GraphQLContext
  ) {
    return this.annotationService.findAll(
      { assetId, userId, layer, limit, offset },
      context.authContext
    );
  }

  @Query('annotationsByAsset')
  async getAnnotationsByAsset(
    @Args('assetId') assetId: string,
    @Args('layer') layer: string | undefined,
    @Context() context: GraphQLContext
  ) {
    return this.annotationService.findByAsset(
      assetId,
      layer,
      context.authContext
    );
  }

  @Query('annotationsByUser')
  async getAnnotationsByUser(
    @Args('userId') userId: string,
    @Args('limit') limit: number = 20,
    @Args('offset') offset: number = 0,
    @Context() context: GraphQLContext
  ) {
    return this.annotationService.findByUser(
      userId,
      limit,
      offset,
      context.authContext
    );
  }

  @Mutation('createAnnotation')
  async createAnnotation(
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }

    const validated = CreateAnnotationInputSchema.parse(input);
    const assetId = (validated as { assetId: string }).assetId;

    const span = tracer.startSpan('annotation.create', {
      attributes: {
        'asset.id': assetId,
        'user.id': context.authContext.userId,
        'tenant.id': context.authContext.tenantId ?? '',
      },
    });

    try {
      const annotation = await this.annotationService.create(
        validated,
        context.authContext
      );

      // Broadcast to all subscribers watching this asset
      pubSub.publish(`annotationAdded_${assetId}`, {
        annotationAdded: annotation,
      });

      this.logger.debug(
        `Published annotationAdded for assetId=${assetId} id=${(annotation as { id: string }).id}`
      );

      span.setAttribute(
        'annotation.id',
        (annotation as { id: string }).id ?? ''
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return annotation;
    } catch (err) {
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  }

  @Mutation('updateAnnotation')
  async updateAnnotation(
    @Args('id') id: string,
    @Args('input') input: unknown,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }

    const validated = UpdateAnnotationInputSchema.parse(input);
    return this.annotationService.update(id, validated, context.authContext);
  }

  @Mutation('deleteAnnotation')
  async deleteAnnotation(
    @Args('id') id: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }
    return this.annotationService.delete(id, context.authContext);
  }

  @Mutation('resolveAnnotation')
  async resolveAnnotation(
    @Args('id') id: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }
    return this.annotationService.resolve(id, context.authContext);
  }

  @Mutation('replyToAnnotation')
  async replyToAnnotation(
    @Args('annotationId') annotationId: string,
    @Args('content') content: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }
    return this.annotationService.replyTo(
      annotationId,
      content,
      context.authContext
    );
  }

  @Subscription('annotationAdded', {
    filter: (
      payload: { annotationAdded: { asset_id?: string } },
      variables: { assetId: string }
    ) => {
      return payload.annotationAdded?.asset_id === variables.assetId;
    },
  })
  subscribeToAnnotationAdded(@Args('assetId') assetId: string) {
    return pubSub.subscribe(`annotationAdded_${assetId}`);
  }

  @ResolveReference()
  async resolveReference(
    reference: { __typename: string; id: string },
    @Context() context: GraphQLContext
  ) {
    return this.annotationService.findById(reference.id, context.authContext);
  }
}
