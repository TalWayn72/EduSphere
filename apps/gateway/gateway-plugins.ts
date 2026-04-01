/**
 * Gateway plugins — Response cache, Cache-Control headers, and
 * Authorization header propagation for Hive Gateway v2.
 * Extracted from gateway.config.ts to keep files under 300 lines.
 */
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// ─── JWT Configuration ───────────────────────────────────────────────────────
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'edusphere';
const JWKS_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;
// KEYCLOAK_ISSUER_URL allows the issuer in tokens (e.g. http://localhost:8080)
// to differ from KEYCLOAK_URL used for internal JWKS fetching (e.g. http://keycloak:8080).
const KEYCLOAK_ISSUER_URL = process.env.KEYCLOAK_ISSUER_URL || KEYCLOAK_URL;
const KEYCLOAK_ISSUER = `${KEYCLOAK_ISSUER_URL}/realms/${KEYCLOAK_REALM}`;
const KEYCLOAK_AUDIENCE = process.env['KEYCLOAK_CLIENT_ID'] ?? 'edusphere-web';
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));
const DEV_TOKEN = 'dev-token-mock-jwt';

const isProduction = process.env.NODE_ENV === 'production';

// ─── Response Cache TTL Configuration ────────────────────────────────────────
const CONTENT_TTL_MS = 60_000;
const COURSE_TTL_MS = 30_000;
const DEFAULT_TTL_MS = 60_000;

const COURSE_QUERY_RE = /^\s*(?:query\s+\w*\s*[({]?\s*)?{?\s*\bcourses?\b/i;

function resolveTtlMs(documentString: string): number {
  if (COURSE_QUERY_RE.test(documentString)) {
    return COURSE_TTL_MS;
  }
  return DEFAULT_TTL_MS;
}

/**
 * Build the gateway plugin array for Hive Gateway v2.
 */
export function buildGatewayPlugins() {
  return [
    useResponseCache({
      ttl: DEFAULT_TTL_MS,
      ttlPerSchemaCoordinate: {
        'Query.contentItem': CONTENT_TTL_MS,
        'Query.contentItems': CONTENT_TTL_MS,
        'Query.myContentItems': CONTENT_TTL_MS,
        'Query.course': COURSE_TTL_MS,
        'Query.courses': COURSE_TTL_MS,
        'Query.myCourses': COURSE_TTL_MS,
        'Query.enrolledCourses': COURSE_TTL_MS,
      },
      session: () => null,
      enabled: (request) =>
        request.method === 'GET' ||
        (request.headers.get('content-type')?.includes('application/graphql') ??
          false),
      buildResponseCacheKey: async ({
        documentString,
        variableValues,
        request,
      }) => {
        const tenantId = request.headers.get('x-tenant-id') ?? 'anonymous';
        const ttlBucket = resolveTtlMs(documentString);
        return `${tenantId}:ttl${ttlBucket}:${documentString}:${JSON.stringify(variableValues ?? {})}`;
      },
      shouldCacheResult: ({ result }) => !result.errors?.length,
    }),

    // Cache-Control: stale-while-revalidate header
    {
      onResponse({
        request,
        response,
        serverContext: _ctx,
      }: {
        request: { method: string };
        response: { headers: { set: (k: string, v: string) => void } };
        serverContext: unknown;
      }) {
        if (request.method !== 'GET') return;
        const maxAge = Math.floor(DEFAULT_TTL_MS / 1000);
        const swr = Math.floor(maxAge / 2);
        response.headers.set(
          'Cache-Control',
          `public, max-age=${maxAge}, stale-while-revalidate=${swr}`
        );
      },
    },

    // Authorization Header Propagation — Phase 1: onContextBuilding
    {
      async onContextBuilding({
        context,
        extendContext,
      }: {
        context: Record<string, unknown>;
        extendContext: (ctx: Record<string, unknown>) => void;
      }) {
        const req = context['request'] as Request | undefined;
        const connParams = context['connectionParams'] as
          | Record<string, string>
          | undefined;

        const auth =
          req?.headers?.get('authorization') ??
          connParams?.['authorization'] ??
          null;

        const tenantId =
          req?.headers?.get('x-tenant-id') ??
          connParams?.['x-tenant-id'] ??
          null;

        let userId: string | null = null;
        let role: string | null = null;
        let resolvedTenantId = tenantId;

        if (auth?.startsWith('Bearer ')) {
          const token = auth.slice(7);
          if (
            token === DEV_TOKEN &&
            !isProduction &&
            process.env['ALLOW_DEV_TOKEN'] === 'true'
          ) {
            const APP_ROLES = new Set([
              'SUPER_ADMIN',
              'ORG_ADMIN',
              'INSTRUCTOR',
              'STUDENT',
              'RESEARCHER',
            ]);
            const devRole = process.env['DEV_TOKEN_ROLE'] ?? 'STUDENT';
            userId = '00000000-0000-0000-0000-000000000001';
            resolvedTenantId = '00000000-0000-0000-0000-000000000000';
            role = APP_ROLES.has(devRole) ? devRole : 'STUDENT';
          } else {
            try {
              const { payload } = await jwtVerify(token, JWKS, {
                issuer: KEYCLOAK_ISSUER,
                audience: KEYCLOAK_AUDIENCE,
              });
              userId = (payload.sub as string) ?? null;
              resolvedTenantId = (payload.tenant_id as string) ?? tenantId;
              const roles =
                (payload.realm_access as { roles?: string[] })?.roles ?? [];
              const knownRoles = [
                'SUPER_ADMIN',
                'ORG_ADMIN',
                'INSTRUCTOR',
                'STUDENT',
                'RESEARCHER',
              ];
              role = roles.find((r) => knownRoles.includes(r)) ?? null;
            } catch {
              // JWT validation failure — subgraph will re-validate
            }
          }
        }

        extendContext({
          _authHeader: auth,
          _tenantId: resolvedTenantId,
          userId,
          role,
        });
      },
    },

    // Phase 2: onFetch — forward auth headers to subgraphs
    {
      onFetch({
        options,
        setOptions,
        context,
      }: {
        options: { headers?: Record<string, string> };
        setOptions: (opts: Record<string, unknown>) => void;
        context: Record<string, unknown> | null | undefined;
      }) {
        const ctx = context;
        const auth =
          (ctx?.['_authHeader'] as string | null) ??
          (ctx?.['request'] as Request | undefined)?.headers?.get(
            'authorization'
          ) ??
          (ctx?.['connectionParams'] as Record<string, string> | undefined)?.[
            'authorization'
          ] ??
          null;

        if (!auth) return;

        const prev = options.headers as Record<string, string> | undefined;
        const forwarded: Record<string, string> = {
          ...(prev ?? {}),
          authorization: auth,
        };

        const tenantId = ctx?.['_tenantId'] as string | null;
        if (tenantId) forwarded['x-tenant-id'] = tenantId;
        if (ctx?.['userId']) forwarded['x-user-id'] = ctx['userId'] as string;
        if (ctx?.['role']) forwarded['x-user-role'] = ctx['role'] as string;

        setOptions({ ...options, headers: forwarded });
      },
    },
  ];
}
