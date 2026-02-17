import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CourseService } from './course.service';

@Resolver('Course')
export class CourseResolver {
  constructor(private readonly courseService: CourseService) {}

  @Query('_health')
  health(): string {
    return 'ok';
  }

  @Query('course')
  async getCourse(@Args('id') id: string) {
    return this.courseService.findById(id);
  }

  @Query('courses')
  async getCourses(
    @Args('limit') limit: number,
    @Args('offset') offset: number
  ) {
    return this.courseService.findAll(limit, offset);
  }

  @Mutation('createCourse')
  async createCourse(@Args('input') input: any) {
    return this.courseService.create(input);
  }

  @Mutation('updateCourse')
  async updateCourse(@Args('id') id: string, @Args('input') input: any) {
    return this.courseService.update(id, input);
  }
}
