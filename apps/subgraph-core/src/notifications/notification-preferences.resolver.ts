/**
 * NotificationPreferencesResolver — Phase 65.
 * GraphQL resolver for user notification preference queries and mutations.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import type { PreferenceDto } from './notification-preferences.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

interface UpdatePrefInput {
  notificationType: string;
  channel: string;
  enabled: boolean;
}

@Resolver()
export class NotificationPreferencesResolver {
  constructor(private readonly prefService: NotificationPreferencesService) {}

  @Query('myNotificationPreferences')
  async myNotificationPreferences(
    @Context() ctx: GraphQLContext
  ): Promise<PreferenceDto[]> {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.prefService.getPreferences(auth.userId, auth.tenantId);
  }

  @Mutation('updateNotificationPreference')
  async updateNotificationPreference(
    @Args('input') input: UpdatePrefInput,
    @Context() ctx: GraphQLContext
  ): Promise<PreferenceDto> {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.prefService.updatePreference(
      auth.userId,
      auth.tenantId,
      input.notificationType,
      input.channel,
      input.enabled
    );
  }
}
