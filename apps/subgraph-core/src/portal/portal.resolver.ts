/**
 * PortalResolver — thin GraphQL resolver for F-037 Portal Builder.
 * Auth: ORG_ADMIN for mutations; publicPortal has no auth.
 * Delegates all logic to PortalService.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { PortalService } from './portal.service.js';
import type { PortalBlock } from '@edusphere/db';
import type { GraphQLContext } from '../auth/auth.middleware.js';

/** Extract tenant ID from authContext (preferred) or x-tenant-id header (gateway fallback). */
function extractTenantId(ctx: GraphQLContext): string | undefined {
  if (ctx.authContext?.tenantId) return ctx.authContext.tenantId;
  const header = ctx.req?.headers?.['x-tenant-id'];
  return (Array.isArray(header) ? header[0] : header) ?? undefined;
}

/** Extract user ID from authContext (preferred) or x-user-id header (gateway fallback). */
function extractUserId(ctx: GraphQLContext): string {
  if (ctx.authContext?.userId) return ctx.authContext.userId;
  const header = ctx.req?.headers?.['x-user-id'];
  return (Array.isArray(header) ? header[0] : header) ?? 'unknown';
}

interface PortalBlockGql {
  id: string;
  type: string;
  order: number;
  config: string;
}

interface PortalPageGql {
  id: string;
  title: string;
  published: boolean;
  blocks: PortalBlockGql[];
  updatedAt: string;
}

function toGqlPage(page: {
  id: string;
  title: string;
  published: boolean;
  layout: unknown;
  updatedAt: Date;
}): PortalPageGql {
  const blocks = (page.layout as PortalBlock[]).map((b) => ({
    id: b.id,
    type: b.type,
    order: b.order,
    config: JSON.stringify(b.config),
  }));
  return {
    id: page.id,
    title: page.title,
    published: page.published,
    blocks,
    updatedAt: page.updatedAt.toISOString(),
  };
}

@Resolver()
export class PortalResolver {
  constructor(private readonly portalService: PortalService) {}

  @Query('myPortal')
  async myPortal(
    @Context() ctx: GraphQLContext
  ): Promise<PortalPageGql | null> {
    const tenantId = extractTenantId(ctx);
    if (!tenantId) return null;
    const page = await this.portalService.getPortalPage(tenantId);
    return page ? toGqlPage(page) : null;
  }

  @Query('publicPortal')
  async publicPortal(
    @Context() ctx: GraphQLContext
  ): Promise<PortalPageGql | null> {
    const tenantId = extractTenantId(ctx);
    if (!tenantId) return null;
    const page = await this.portalService.getPublishedPortalPage(tenantId);
    return page ? toGqlPage(page) : null;
  }

  @Mutation('savePortalLayout')
  async savePortalLayout(
    @Args('title') title: string,
    @Args('blocksJson') blocksJson: string,
    @Context() ctx: GraphQLContext
  ): Promise<PortalPageGql> {
    const tenantId = extractTenantId(ctx);
    const userId = extractUserId(ctx);
    if (!tenantId) throw new Error('Missing tenant context');
    const blocks = JSON.parse(blocksJson) as PortalBlock[];
    const page = await this.portalService.createOrUpdatePortal(
      tenantId,
      blocks,
      title,
      userId
    );
    return toGqlPage(page);
  }

  @Mutation('publishPortal')
  async publishPortal(@Context() ctx: GraphQLContext): Promise<boolean> {
    const tenantId = extractTenantId(ctx);
    if (!tenantId) return false;
    await this.portalService.publishPortal(tenantId);
    return true;
  }

  @Mutation('unpublishPortal')
  async unpublishPortal(@Context() ctx: GraphQLContext): Promise<boolean> {
    const tenantId = extractTenantId(ctx);
    if (!tenantId) return false;
    await this.portalService.unpublishPortal(tenantId);
    return true;
  }
}
