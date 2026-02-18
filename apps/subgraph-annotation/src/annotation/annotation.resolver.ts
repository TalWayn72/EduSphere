import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveReference,
  Context,
} from '@nestjs/graphql';
import { AnnotationService } from './annotation.service';
import {
  CreateAnnotationInputSchema,
  UpdateAnnotationInputSchema,
} from './annotation.schemas';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: any;
  authContext?: AuthContext;
}

@Resolver('Annotation')
export class AnnotationResolver {
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
    @Args('input') input: any,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }

    const validated = CreateAnnotationInputSchema.parse(input);
    return this.annotationService.create(validated, context.authContext);
  }

  @Mutation('updateAnnotation')
  async updateAnnotation(
    @Args('id') id: string,
    @Args('input') input: any,
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

  @ResolveReference()
  async resolveReference(
    reference: { __typename: string; id: string },
    @Context() context: GraphQLContext
  ) {
    return this.annotationService.findById(reference.id, context.authContext);
  }
}
