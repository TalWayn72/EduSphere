import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { CpdService } from './cpd.service.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';
import type { CreateCreditTypeInput } from './cpd.types.js';

@Resolver()
export class CpdResolver {
  private readonly logger = new Logger(CpdResolver.name);

  constructor(private readonly cpdService: CpdService) {}

  @Query('myCpdReport')
  async myCpdReport(
    @Args('startDate') startDate: string | undefined,
    @Args('endDate') endDate: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const dateRange =
      startDate && endDate
        ? { start: new Date(startDate), end: new Date(endDate) }
        : undefined;

    this.logger.log(
      `myCpdReport: userId=${auth.userId} tenantId=${auth.tenantId}`
    );
    return this.cpdService.getUserCpdReport(
      auth.userId,
      auth.tenantId,
      dateRange
    );
  }

  @Query('cpdCreditTypes')
  async cpdCreditTypes(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.cpdService.listCreditTypes(auth.tenantId);
  }

  @Mutation('exportCpdReport')
  async exportCpdReport(
    @Args('format') format: 'NASBA' | 'AMA' | 'CSV',
    @Context() ctx: GraphQLContext
  ): Promise<string> {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(`exportCpdReport: userId=${auth.userId} format=${format}`);
    return this.cpdService.exportCpdReport(auth.userId, auth.tenantId, format);
  }

  @Mutation('createCpdCreditType')
  async createCpdCreditType(
    @Args('name') name: string,
    @Args('regulatoryBody') regulatoryBody: string,
    @Args('creditHoursPerHour') creditHoursPerHour: number,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    const input: CreateCreditTypeInput = {
      name,
      regulatoryBody,
      creditHoursPerHour,
    };
    this.logger.log(
      `createCpdCreditType: name=${name} regulatoryBody=${regulatoryBody} tenant=${auth.tenantId}`
    );
    return this.cpdService.createCreditType(input, auth.tenantId);
  }

  @Mutation('assignCpdCreditsToCourse')
  async assignCpdCreditsToCourse(
    @Args('courseId') courseId: string,
    @Args('creditTypeId') creditTypeId: string,
    @Args('creditHours') creditHours: number,
    @Context() ctx: GraphQLContext
  ): Promise<boolean> {
    const auth = ctx.authContext;
    if (!auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(
      `assignCpdCreditsToCourse: courseId=${courseId} creditTypeId=${creditTypeId} tenant=${auth.tenantId}`
    );
    await this.cpdService.assignCreditsToCourse(
      courseId,
      creditTypeId,
      creditHours,
      auth.tenantId
    );
    return true;
  }
}
