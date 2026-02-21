import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { TranslationService } from './translation.service';
import { RequestContentTranslationSchema } from './translation.schemas';

interface GqlContext {
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth || !auth.tenantId || !auth.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: auth.roles[0] ?? 'STUDENT',
  };
}

@Resolver('ContentTranslation')
export class TranslationResolver {
  constructor(private readonly translationService: TranslationService) {}

  @Query('contentTranslation')
  async getContentTranslation(
    @Args('contentItemId') contentItemId: string,
    @Args('locale') locale: string,
    @Context() ctx: GqlContext,
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.translationService.findTranslation(contentItemId, locale, tenantCtx);
  }

  @Mutation('requestContentTranslation')
  async requestContentTranslation(
    @Args('contentItemId') contentItemId: string,
    @Args('targetLocale') targetLocale: string,
    @Context() ctx: GqlContext,
  ) {
    const tenantCtx = requireAuth(ctx);

    const parsed = RequestContentTranslationSchema.safeParse({ contentItemId, targetLocale });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join('; '));
    }

    return this.translationService.requestTranslation(
      parsed.data.contentItemId,
      parsed.data.targetLocale,
      tenantCtx,
    );
  }
}
