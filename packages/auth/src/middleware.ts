import { Logger } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { keycloakConfig } from '@edusphere/config';
import { JWTValidator, type AuthContext } from './jwt.js';
import { CircuitBreaker } from '@edusphere/nats-client';

export interface GraphQLContext {
  req: IncomingMessage & {
    headers: Record<string, string | string[] | undefined>;
  };
  authContext?: AuthContext;
}

export class AuthMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  private readonly jwtValidator: JWTValidator;
  private readonly jwksBreaker: CircuitBreaker;

  constructor() {
    this.jwksBreaker = new CircuitBreaker({
      name: 'JWKS',
      failureThreshold: 5,
      resetTimeout: 30_000,
      logger: {
        warn: (msg: string) => this.logger.warn(msg),
        error: (msg: string) => this.logger.error(msg),
        info: (msg: string) => this.logger.log(msg),
      },
    });
    // SEC-3: Subgraphs now validate JWT audience. The Keycloak Client-ID
    // default was fixed from 'edusphere-app' to 'edusphere-web' (packages/config).
    // BUG-073 root cause was the mismatch, not audience validation itself.
    this.jwtValidator = new JWTValidator(
      keycloakConfig.url,
      keycloakConfig.realm,
      keycloakConfig.clientId
    );
    this.logger.log(`JWT Validator initialized: ${keycloakConfig.issuer}`);
  }

  async validateRequest(context: GraphQLContext): Promise<void> {
    const authHeader = context.req?.headers?.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      return;
    }

    try {
      const token = this.jwtValidator.extractToken(authHeader);
      if (!token) {
        return;
      }

      // Dev bypass: accept dev-token-mock-jwt in non-production environments
      // so Playwright/integration tests work without a live Keycloak.
      // SEC-1 hardening: requires ALLOW_DEV_TOKEN=true AND non-production env.
      if (
        process.env.NODE_ENV !== 'production' &&
        process.env['ALLOW_DEV_TOKEN'] === 'true' &&
        token === 'dev-token-mock-jwt'
      ) {
        context.authContext = {
          userId: '00000000-0000-0000-0000-000000000001',
          email: 'super.admin@edusphere.dev',
          username: 'super.admin',
          firstName: 'Super',
          lastName: 'Admin',
          roles: ['SUPER_ADMIN'],
          scopes: [],
          tenantId: '00000000-0000-0000-0000-000000000000',
          isSuperAdmin: true,
        };
        return;
      }

      const authContext = await this.jwksBreaker.execute(() =>
        this.jwtValidator.validate(token)
      );

      // Fallback: use x-tenant-id header if JWT has no tenant_id claim
      if (!authContext.tenantId) {
        const tenantHeader = context.req.headers['x-tenant-id'];
        const tenantId = Array.isArray(tenantHeader)
          ? tenantHeader[0]
          : tenantHeader;
        if (tenantId) {
          authContext.tenantId = tenantId;
          this.logger.warn(
            'JWT missing tenant_id claim — using x-tenant-id header as fallback'
          );
        }
      }

      context.authContext = authContext;

      this.logger.debug(
        `Authenticated: ${authContext.email} (${authContext.roles.join(', ')}) - Tenant: ${authContext.tenantId}`
      );
    } catch (error) {
      // BUG-038 fix: invalid JWT must NOT block public resolvers.
      // The request proceeds unauthenticated; resolvers using
      // extractAuthContext() will reject it if @authenticated is required.
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[AuthMiddleware] JWT validation failed: ${reason}`
      );

      // Fallback: if gateway already validated the JWT and forwarded identity
      // headers (x-user-id, x-tenant-id, x-user-role), use those to populate
      // authContext. This ensures auth works even when subgraph JWT validation
      // fails (e.g. Keycloak JWKS endpoint temporarily unreachable).
      // SEC-1/BE-7: Header fallback NEVER grants SUPER_ADMIN — an attacker who
      // can reach a subgraph directly could spoof x-user-role: SUPER_ADMIN.
      // Only JWT-validated tokens may grant SUPER_ADMIN.
      const userId = this.extractHeader(context, 'x-user-id');
      const tenantId = this.extractHeader(context, 'x-tenant-id');
      const rawRole = this.extractHeader(context, 'x-user-role');
      // SEC-1/BE-7: Header fallback NEVER grants SUPER_ADMIN — an attacker who
      // can reach a subgraph directly could spoof x-user-role: SUPER_ADMIN.
      // Only JWT-validated tokens may grant SUPER_ADMIN.
      const ALLOWED_HEADER_ROLES = new Set([
        'ORG_ADMIN',
        'INSTRUCTOR',
        'STUDENT',
        'RESEARCHER',
      ]);
      const role =
        rawRole && ALLOWED_HEADER_ROLES.has(rawRole) ? rawRole : undefined;
      if (userId) {
        context.authContext = {
          userId,
          email: '',
          username: '',
          roles: role ? [role as AuthContext['roles'][number]] : [],
          scopes: [],
          tenantId: tenantId ?? undefined,
          isSuperAdmin: role === 'SUPER_ADMIN',
        };
        this.logger.warn(
          `[AuthMiddleware] Using gateway-forwarded headers fallback: userId=${userId}, tenantId=${tenantId}, role=${role ?? 'none'}`
        );
      }
    }
  }

  private extractHeader(
    context: GraphQLContext,
    name: string
  ): string | undefined {
    const val = context.req?.headers?.[name];
    if (Array.isArray(val)) return val[0];
    return typeof val === 'string' && val.length > 0 ? val : undefined;
  }
}

export const authMiddleware = new AuthMiddleware();
