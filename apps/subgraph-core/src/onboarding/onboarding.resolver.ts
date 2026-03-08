import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver('OnboardingState')
export class OnboardingResolver {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Query('myOnboardingState')
  async myOnboardingState(@Context() context: GraphQLContext) {
    if (!context.authContext) throw new UnauthorizedException('Unauthenticated');
    const { userId, tenantId, roles } = context.authContext;
    const role = (roles[0] ?? 'STUDENT').toLowerCase();
    return this.onboardingService.getState(userId, tenantId ?? '', role);
  }

  @Mutation('updateOnboardingStep')
  async updateOnboardingStep(
    @Args('input') input: { step: number; data?: Record<string, unknown> },
    @Context() context: GraphQLContext,
  ) {
    if (!context.authContext) throw new UnauthorizedException('Unauthenticated');
    const { userId, tenantId, roles } = context.authContext;
    const role = (roles[0] ?? 'STUDENT').toLowerCase();
    return this.onboardingService.updateStep(userId, tenantId ?? '', role, input.step, input.data ?? {});
  }

  @Mutation('completeOnboarding')
  async completeOnboarding(@Context() context: GraphQLContext) {
    if (!context.authContext) throw new UnauthorizedException('Unauthenticated');
    const { userId, tenantId, roles } = context.authContext;
    const role = (roles[0] ?? 'STUDENT').toLowerCase();
    return this.onboardingService.completeOnboarding(userId, tenantId ?? '', role);
  }

  @Mutation('skipOnboarding')
  async skipOnboarding(@Context() context: GraphQLContext) {
    if (!context.authContext) throw new UnauthorizedException('Unauthenticated');
    const { userId, tenantId, roles } = context.authContext;
    const role = (roles[0] ?? 'STUDENT').toLowerCase();
    return this.onboardingService.skipOnboarding(userId, tenantId ?? '', role);
  }
}
