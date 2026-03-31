import pino from 'pino';

export const logger = pino({
  transport: { target: 'pino-pretty' },
  level: 'info',
});

export const JWKS_URL =
  process.env.KEYCLOAK_JWKS_URL ||
  'http://localhost:8080/realms/edusphere/protocol/openid-connect/certs';

// KEYCLOAK_ISSUER_URL allows the issuer in tokens (e.g. http://localhost:8080) to differ
// from KEYCLOAK_URL used for internal JWKS fetching (e.g. http://keycloak:8080 in Docker).
export const KEYCLOAK_ISSUER = `${process.env.KEYCLOAK_ISSUER_URL || process.env.KEYCLOAK_URL || 'http://localhost:8080'}/realms/${process.env.KEYCLOAK_REALM || 'edusphere'}`;

// SEC-3: JWT audience check — validates token was issued for our client
export const KEYCLOAK_AUDIENCE = process.env['KEYCLOAK_CLIENT_ID'] ?? 'edusphere-web';

export const APP_ROLES = new Set([
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'INSTRUCTOR',
  'STUDENT',
  'RESEARCHER',
]);

/** Build a 429 Rate-Limit-Exceeded JSON response. */
export function rateLimitedResponse(resetAt: number): Response {
  const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      errors: [
        {
          message: 'Rate limit exceeded. Please retry later.',
          extensions: { code: 'RATE_LIMIT_EXCEEDED', retryAfter: resetAt },
        },
      ],
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}
