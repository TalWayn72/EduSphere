/**
 * CertExamGenResolver — thin resolver for generateCertExamItems mutation.
 *
 * Delegates to CertExamGenService which enforces SI-10 consent.
 */
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { CertExamGenService } from './cert-exam-gen.service.js';
import type { GraphQLContext } from '@edusphere/auth';

interface GenerateCertExamItemsArgs {
  moduleId: string;
  targetBloomLevels: string[];
  targetCount: number;
  targetDifficulty: string;
  locale?: string;
}

@Resolver()
export class CertExamGenResolver {
  private readonly logger = new Logger(CertExamGenResolver.name);

  constructor(private readonly certExamGenService: CertExamGenService) {}

  @Mutation('generateCertExamItems')
  async generateCertExamItems(
    @Args('input') input: GenerateCertExamItemsArgs,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }

    const tenantId = auth.tenantId ?? 'default';

    this.logger.log(
      { userId: auth.userId, tenantId, moduleId: input.moduleId },
      '[CertExamGenResolver] generateCertExamItems started'
    );

    const result = await this.certExamGenService.generateItems(
      {
        moduleId: input.moduleId,
        targetBloomLevels: input.targetBloomLevels,
        targetCount: input.targetCount,
        targetDifficulty: input.targetDifficulty,
        locale: input.locale,
      },
      auth.userId,
      tenantId
    );

    return {
      executionId: result.executionId,
      status: result.status,
      itemCount: result.itemCount,
    };
  }
}
