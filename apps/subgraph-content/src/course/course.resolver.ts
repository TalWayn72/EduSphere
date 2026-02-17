import { Resolver, Query, Mutation, Args, ResolveField, Parent, ResolveReference } from '@nestjs/graphql';
import { CourseService } from './course.service';

@Resolver('Course')
export class CourseResolver {
  constructor(private readonly courseService: CourseService) {}

  @Query('course')
  async getCourse(@Args('id') id: string) {
    return this.courseService.findById(id);
  }

  @Query('courses')
  async getCourses(
    @Args('limit') limit: number = 20,
    @Args('offset') offset: number = 0,
  ) {
    return this.courseService.findAll(limit, offset);
  }

  @Query('coursesByInstructor')
  async getCoursesByInstructor(
    @Args('instructorId') instructorId: string,
    @Args('limit') limit: number = 20,
  ) {
    return this.courseService.findByInstructor(instructorId, limit);
  }

  @Mutation('createCourse')
  async createCourse(@Args('input') input: any) {
    return this.courseService.create(input);
  }

  @Mutation('updateCourse')
  async updateCourse(@Args('id') id: string, @Args('input') input: any) {
    return this.courseService.update(id, input);
  }

  @Mutation('deleteCourse')
  async deleteCourse(@Args('id') id: string) {
    return this.courseService.delete(id);
  }

  @Mutation('publishCourse')
  async publishCourse(@Args('id') id: string) {
    return this.courseService.publish(id);
  }

  @Mutation('unpublishCourse')
  async unpublishCourse(@Args('id') id: string) {
    return this.courseService.unpublish(id);
  }

  @ResolveField('modules')
  async getModules(@Parent() course: any) {
    // Will be resolved by Module subgraph
    return [];
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.courseService.findById(reference.id);
  }
}
