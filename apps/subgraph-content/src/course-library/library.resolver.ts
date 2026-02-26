import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { LibraryService, type LibraryTopic } from './library.service.js';

interface GqlContext {
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth?.tenantId || !auth?.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: (auth.roles[0] ?? 'STUDENT') as TenantContext['userRole'],
  };
}

@Resolver()
export class LibraryResolver {
  constructor(private readonly libraryService: LibraryService) {}

  @Query('libraryCourses')
  async listLibraryCourses(
    @Args('topic') topic: LibraryTopic | undefined,
    @Context() ctx: GqlContext
  ) {
    const auth = requireAuth(ctx);
    const courses = await this.libraryService.listLibraryCourses(
      topic ? { topic } : undefined
    );

    // Resolve isActivated per course for this tenant
    const activations = await this.libraryService.getTenantActivations(
      auth.tenantId
    );
    const activatedIds = new Set(activations.map((a) => a.libraryCourseId));

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      topic: c.topic,
      licenseType: c.licenseType,
      priceCents: c.priceCents,
      durationMinutes: c.durationMinutes,
      isActivated: activatedIds.has(c.id),
    }));
  }

  @Query('myLibraryActivations')
  async getMyLibraryActivations(@Context() ctx: GqlContext) {
    const auth = requireAuth(ctx);
    const activations = await this.libraryService.getTenantActivations(
      auth.tenantId
    );
    return activations.map((a) => ({
      id: a.id,
      libraryCourseId: a.libraryCourseId,
      courseId: a.courseId ?? null,
      activatedAt: a.activatedAt.toISOString(),
    }));
  }

  @Mutation('activateLibraryCourse')
  async activateCourse(
    @Args('libraryCourseId') libraryCourseId: string,
    @Context() ctx: GqlContext
  ) {
    const auth = requireAuth(ctx);
    const activation = await this.libraryService.activateCourse(
      auth.tenantId,
      libraryCourseId,
      auth.userId
    );
    return {
      id: activation.id,
      libraryCourseId: activation.libraryCourseId,
      courseId: activation.courseId ?? null,
      activatedAt: activation.activatedAt.toISOString(),
    };
  }

  @Mutation('deactivateLibraryCourse')
  async deactivateCourse(
    @Args('libraryCourseId') libraryCourseId: string,
    @Context() ctx: GqlContext
  ) {
    const auth = requireAuth(ctx);
    await this.libraryService.deactivateCourse(auth.tenantId, libraryCourseId);
    return true;
  }
}
