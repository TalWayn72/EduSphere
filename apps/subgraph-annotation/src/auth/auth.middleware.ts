import { JWTValidator, type AuthContext } from '@edusphere/auth';
import { Logger } from '@nestjs/common';

export interface GraphQLContext {
  req: any;
  authContext?: AuthContext;
}

export class AuthMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  private jwtValidator: JWTValidator;

  constructor() {
    const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    const realm = process.env.KEYCLOAK_REALM || 'edusphere';
    const clientId = process.env.KEYCLOAK_CLIENT_ID;

    this.jwtValidator = new JWTValidator(keycloakUrl, realm, clientId);
    this.logger.log(
      `JWT Validator initialized: ${keycloakUrl}/realms/${realm}`
    );
  }

  async validateRequest(context: GraphQLContext): Promise<void> {
    const authHeader = context.req?.headers?.authorization;

    if (!authHeader) {
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
        `Authenticated: ${authContext.email} (${authContext.roles.join(', ')}) - Tenant: ${authContext.tenantId}`
      );
    } catch (error) {
      this.logger.error(`JWT validation failed: ${error}`);
      throw new Error('Unauthorized');
    }
  }
}

export const authMiddleware = new AuthMiddleware();
