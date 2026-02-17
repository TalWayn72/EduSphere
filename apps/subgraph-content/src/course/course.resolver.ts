import { Resolver, Query, Mutation, Subscription, Args, ResolveField, Parent, ResolveReference } from '@nestjs/graphql';
import { CourseService } from './course.service';
import { PubSub } from 'graphql-subscriptions';

const COURSE_CREATED = 'courseCreated';
const COURSE_UPDATED = 'courseUpdated';
const COURSE_PUBLISHED = 'coursePublished';

@Resolver('Course')
export class CourseResolver {
  private pubsub: PubSub;

  constructor(private readonly courseService: CourseService) {
    this.pubsub = new PubSub();
  }

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
    const course = await this.courseService.create(input);
    this.pubsub.publish(COURSE_CREATED, { courseCreated: course, tenantId: input.tenantId });
    return course;
  }

  @Mutation('updateCourse')
  async updateCourse(@Args('id') id: string, @Args('input') input: any) {
    const course = await this.courseService.update(id, input);
    this.pubsub.publish(COURSE_UPDATED, { courseUpdated: course, courseId: id, tenantId: course.tenantId });
    return course;
  }

  @Mutation('deleteCourse')
  async deleteCourse(@Args('id') id: string) {
    return this.courseService.delete(id);
  }

  @Mutation('publishCourse')
  async publishCourse(@Args('id') id: string) {
    const course = await this.courseService.publish(id);
    this.pubsub.publish(COURSE_PUBLISHED, { coursePublished: course, tenantId: course.tenantId });
    return course;
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

  @Subscription('courseCreated', {
    filter: (payload, variables) => payload.tenantId === variables.tenantId,
  })
  courseCreatedSubscription(@Args('tenantId') tenantId: string) {
    return this.pubsub.asyncIterator(COURSE_CREATED);
  }

  @Subscription('courseUpdated', {
    filter: (payload, variables) => payload.courseId === variables.courseId && payload.tenantId === variables.tenantId,
  })
  courseUpdatedSubscription(@Args('courseId') courseId: string, @Args('tenantId') tenantId: string) {
    return this.pubsub.asyncIterator(COURSE_UPDATED);
  }

  @Subscription('coursePublished', {
    filter: (payload, variables) => payload.tenantId === variables.tenantId,
  })
  coursePublishedSubscription(@Args('tenantId') tenantId: string) {
    return this.pubsub.asyncIterator(COURSE_PUBLISHED);
  }
}
