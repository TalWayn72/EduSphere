import { createRemoteJWKSet, jwtVerify } from 'jose';
import { checkRateLimit } from './middleware/rate-limit.js';
import {
  depthLimitRule,
  complexityLimitRule,
} from './middleware/query-complexity.js';
import {
  logger,
  JWKS_URL,
  KEYCLOAK_ISSUER,
  KEYCLOAK_AUDIENCE,
  APP_ROLES,
  rateLimitedResponse,
} from './gateway-config.js';
import type { PubSubEngine } from './nats-subscriptions.js';

const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

/** Build the gateway plugin array (validation + auth context + header forwarding). */
export function createGatewayPlugins(pubSub: PubSubEngine) {
  return [
    // G-10: query depth + complexity validation
    {
      onValidate({ addValidationRule }: { addValidationRule: (rule: unknown) => void }) {
        addValidationRule(depthLimitRule());
        addValidationRule(complexityLimitRule());
      },
    },
    // G-09 + BUG-049: JWT auth context + header forwarding
    {
      async onContextBuilding({ context, extendContext }: {
        context: Record<string, unknown>;
        extendContext: (ext: Record<string, unknown>) => void;
      }) {
        const request = context['request'] as Request | undefined;
        if (!request) return;

        // BUG-049 fix: WebSocket subscriptions send JWT in connectionParams
        const wsConnectionParams = context['connectionParams'] as Record<string, unknown> | undefined;
        const wsAuthHeader =
          typeof wsConnectionParams?.['authorization'] === 'string'
            ? wsConnectionParams['authorization']
            : undefined;

        const tenantId =
          request.headers.get('x-tenant-id') ??
          request.headers.get('x-forwarded-for') ??
          'unknown';

        const rateCheck = checkRateLimit(tenantId);
        if (!rateCheck.allowed) {
          logger.warn(
            { tenantId, resetAt: rateCheck.resetAt },
            'G-09: rate limit exceeded (context)'
          );
          throw Object.assign(new Error('Rate limit exceeded'), {
            _rateLimitResponse: rateLimitedResponse(rateCheck.resetAt),
          });
        }

        const authHeader =
          request.headers.get('authorization') ?? wsAuthHeader ?? null;
        let resolvedTenantId: string | null = null;
        let userId: string | null = null;
        let role: string | null = null;
        let isAuthenticated = false;

        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7);

          // Dev bypass for E2E tests (BUG-23): accept well-known dev token
          if (
            process.env.NODE_ENV !== 'production' &&
            process.env['ALLOW_DEV_TOKEN'] === 'true' &&
            token === 'dev-token-mock-jwt'
          ) {
            const devRole = process.env['DEV_TOKEN_ROLE'] ?? 'STUDENT';
            resolvedTenantId = '00000000-0000-0000-0000-000000000000';
            userId = '00000000-0000-0000-0000-000000000001';
            role = APP_ROLES.has(devRole) ? devRole : 'STUDENT';
            isAuthenticated = true;
            logger.warn({ role }, 'SEC-1: dev-token bypass active — for E2E tests only');
          } else {
            try {
              const { payload } = await jwtVerify(token, JWKS, {
                issuer: KEYCLOAK_ISSUER,
                audience: KEYCLOAK_AUDIENCE,
              });
              resolvedTenantId = (payload['tenant_id'] as string) ?? null;
              userId = payload.sub ?? null;
              role =
                (payload['role'] as string) ??
                (
                  (
                    (payload['realm_access'] as Record<string, unknown>)
                      ?.['roles'] as string[]
                  )?.find((r) => APP_ROLES.has(r)) ?? null
                );
              isAuthenticated = true;
              if (wsAuthHeader && !request.headers.get('authorization')) {
                logger.debug(
                  { userId },
                  'Gateway: authenticated subscription via WebSocket connectionParams'
                );
              }
            } catch (error) {
              logger.warn(
                { err: error },
                'JWT verification failed — request proceeds unauthenticated'
              );
            }
          }
        }

        extendContext({
          isAuthenticated,
          userId,
          tenantId: resolvedTenantId,
          role,
          pubSub,
          headers: {
            authorization: authHeader,
            'x-tenant-id': resolvedTenantId,
            'x-user-id': userId,
            'x-user-role': role,
          },
        });
      },
    },
    // BUG-049: Forward Authorization + tenant/user headers to every subgraph fetch
    {
      onFetch({
        options,
        setOptions,
        context,
      }: {
        options: RequestInit;
        setOptions: (opts: RequestInit) => void;
        context: unknown;
      }) {
        const ctx = context as
          | { headers?: Record<string, string | null> }
          | null
          | undefined;
        const auth = ctx?.headers?.authorization;
        if (!auth) return;
        const prev = options.headers as Record<string, string> | undefined;
        const forwarded: Record<string, string> = { ...(prev ?? {}), authorization: auth };
        if (ctx?.headers?.['x-tenant-id']) forwarded['x-tenant-id'] = ctx.headers['x-tenant-id'];
        if (ctx?.headers?.['x-user-id']) forwarded['x-user-id'] = ctx.headers['x-user-id'];
        if (ctx?.headers?.['x-user-role']) forwarded['x-user-role'] = ctx.headers['x-user-role'];
        setOptions({ ...options, headers: forwarded });
      },
    },
  ];
}
