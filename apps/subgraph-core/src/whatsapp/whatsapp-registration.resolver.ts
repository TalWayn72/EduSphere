/**
 * WhatsAppRegistrationResolver — Phase 65.
 * GraphQL resolver for WhatsApp phone registration and OTP verification.
 */
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { WhatsAppRegistrationService } from './whatsapp-registration.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver()
export class WhatsAppRegistrationResolver {
  constructor(
    private readonly registrationService: WhatsAppRegistrationService
  ) {}

  @Mutation('registerWhatsApp')
  async registerWhatsApp(
    @Args('phoneNumber') phoneNumber: string,
    @Args('countryCode') countryCode: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.registrationService.register(
      auth.userId,
      auth.tenantId,
      phoneNumber,
      countryCode
    );
  }

  @Mutation('verifyWhatsApp')
  async verifyWhatsApp(
    @Args('code') code: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.registrationService.verify(auth.userId, auth.tenantId, code);
  }
}
