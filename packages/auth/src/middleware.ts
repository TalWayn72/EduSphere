import { Logger } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { keycloakConfig } from '@edusphere/config';
import { JWTValidator, type AuthContext } from './jwt.js';

export interface GraphQLContext {
  req: IncomingMessage & { headers: Record<string, string | string[] | undefined> };
  authContext?: AuthContext;
}

export class AuthMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  private readonly jwtValidator: JWTValidator;

  constructor() {
    this.jwtValidator = new JWTValidator(
      keycloakConfig.url,
      keycloakConfig.realm,
      keycloakConfig.clientId,
    );
    this.logger.log(`JWT Validator initialized: ${keycloakConfig.issuer}`);
  }

  async validateRequest(context: GraphQLContext): Promise<void> {
    const authHeader = context.req?.headers?.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      this.logger.warn('No authorization header provided');
      return;
    }

    try {
      const token = this.jwtValidator.extractToken(authHeader);
      if (!token) {
        this.logger.warn('Invalid authorization header format');
        return;
      }

      const authContext = await this.jwtValidator.validate(token);
      context.authContext = authContext;

      this.logger.debug(
        `Authenticated: ${authContext.email} (${authContext.roles.join(', ')}) - Tenant: ${authContext.tenantId}`,
      );
    } catch (error) {
      this.logger.error(`JWT validation failed: ${error}`);
      throw new Error('Unauthorized');
    }
  }
}

export const authMiddleware = new AuthMiddleware();
