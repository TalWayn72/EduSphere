import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { ConsentService } from './consent.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver()
export class ConsentResolver {
  constructor(private readonly consentService: ConsentService) {}

  @Mutation('updateConsent')
  async updateConsent(
    @Args('input') input: { consentType: string; given: boolean },
    @Context() context: GraphQLContext
  ): Promise<boolean> {
    const auth = context.authContext;
    if (!auth) throw new Error('Unauthenticated');

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
  }
}
