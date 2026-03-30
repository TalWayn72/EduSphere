import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { ConsentService } from './consent.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver()
export class ConsentResolver {
  private readonly logger = new Logger(ConsentResolver.name);

  constructor(private readonly consentService: ConsentService) {}

  @Mutation('updateConsent')
  async updateConsent(
    @Args('input') input: { consentType: string; given: boolean },
    @Context() context: GraphQLContext
  ): Promise<boolean> {
    const auth = context.authContext;
    if (!auth) {
      this.logger.error('[ConsentResolver] updateConsent called without auth');
      throw new Error('Unauthenticated');
    }

    if (!auth.tenantId) {
      this.logger.error(
        { userId: auth.userId },
        '[ConsentResolver] updateConsent: missing tenantId in auth context'
      );
      throw new Error('Missing tenant context');
    }

    try {
      await this.consentService.updateConsent({
        tenantId: auth.tenantId,
        userId: auth.userId,
        consentType: input.consentType as
          | 'AI_PROCESSING'
          | 'THIRD_PARTY_LLM'
          | 'ANALYTICS'
          | 'MARKETING'
          | 'RESEARCH',
        given: input.given,
        method: 'SETTINGS_UI',
      });
      return true;
    } catch (err) {
      this.logger.error(
        {
          userId: auth.userId,
          tenantId: auth.tenantId,
          consentType: input.consentType,
          err,
        },
        '[ConsentResolver] Failed to update consent'
      );
      throw err;
    }
  }
}
