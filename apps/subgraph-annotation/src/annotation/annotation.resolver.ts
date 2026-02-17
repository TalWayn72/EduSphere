import { Resolver, Query, Mutation, Args, ResolveReference } from '@nestjs/graphql';
import { AnnotationService } from './annotation.service';

@Resolver('Annotation')
export class AnnotationResolver {
  constructor(private readonly annotationService: AnnotationService) {}

  @Query('annotation')
  async getAnnotation(@Args('id') id: string) {
    return this.annotationService.findById(id);
  }

  @Query('annotationsByContentItem')
  async getAnnotationsByContentItem(@Args('contentItemId') contentItemId: string) {
    return this.annotationService.findByContentItem(contentItemId);
  }

  @Query('annotationsByUser')
  async getAnnotationsByUser(@Args('userId') userId: string) {
    return this.annotationService.findByUser(userId);
  }

  @Query('annotationsByType')
  async getAnnotationsByType(
    @Args('contentItemId') contentItemId: string,
    @Args('type') type: string,
  ) {
    return this.annotationService.findByType(contentItemId, type);
  }

  @Mutation('createAnnotation')
  async createAnnotation(@Args('input') input: any) {
    return this.annotationService.create(input);
  }

  @Mutation('updateAnnotation')
  async updateAnnotation(@Args('id') id: string, @Args('input') input: any) {
    return this.annotationService.update(id, input);
  }

  @Mutation('deleteAnnotation')
  async deleteAnnotation(@Args('id') id: string) {
    return this.annotationService.delete(id);
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.annotationService.findById(reference.id);
  }
}
