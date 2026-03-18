/**
 * TenantSocialLinksResolver — Phase 65.
 * GraphQL resolver for tenant social media link queries and mutations.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { TenantSocialLinksService } from './tenant-social-links.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

interface UpdateSocialLinksInput {
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  whatsappUrl?: string | null;
  githubUrl?: string | null;
}

@Resolver()
export class TenantSocialLinksResolver {
  constructor(private readonly svc: TenantSocialLinksService) {}

  @Query('tenantSocialLinks')
  async tenantSocialLinks(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.svc.get(auth.tenantId, auth.userId);
  }

  @Mutation('updateTenantSocialLinks')
  async updateTenantSocialLinks(
    @Args('input') input: UpdateSocialLinksInput,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.svc.upsert(auth.tenantId, auth.userId, input);
  }
}
