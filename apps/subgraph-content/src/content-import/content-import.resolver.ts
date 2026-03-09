import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { ContentImportService } from './content-import.service';
import type { GraphQLContext } from '../auth/auth.middleware';
import type { ImportJobResult } from './content-import.types';

interface ImportJob {
  id: string;
  status: string;
  lessonCount: number;
  estimatedMinutes: number;
}

interface YoutubeImportInput {
  playlistUrl: string;
  courseId: string;
  moduleId: string;
}

interface WebsiteImportInput {
  siteUrl: string;
  courseId: string;
  moduleId: string;
}

function toImportJob(result: ImportJobResult): ImportJob {
  return {
    id: result.jobId,
    status: result.status,
    lessonCount: result.lessonCount,
    estimatedMinutes: result.estimatedMinutes,
  };
}

@Resolver()
export class ContentImportResolver {
  constructor(private readonly contentImportService: ContentImportService) {}

  @Mutation('importFromYoutube')
  async importFromYoutube(
    @Args('input') input: YoutubeImportInput,
    @Context() ctx: GraphQLContext
  ): Promise<ImportJob> {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    const result = await this.contentImportService.importFromYoutube(
      input,
      auth.tenantId,
      auth.userId
    );
    return toImportJob(result);
  }

  @Mutation('importFromWebsite')
  async importFromWebsite(
    @Args('input') input: WebsiteImportInput,
    @Context() ctx: GraphQLContext
  ): Promise<ImportJob> {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    const result = await this.contentImportService.importFromWebsite(
      input,
      auth.tenantId,
      auth.userId
    );
    return toImportJob(result);
  }

  @Mutation('cancelImport')
  cancelImport(
    @Args('jobId') jobId: string,
    @Context() ctx: GraphQLContext
  ): boolean {
    const auth = ctx.authContext;
    if (!auth?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.contentImportService.cancelImport(jobId);
  }
}
