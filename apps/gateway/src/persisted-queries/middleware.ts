/**
 * Persisted Queries enforcement middleware.
 * When PERSISTED_QUERIES_ONLY=true, rejects arbitrary GraphQL documents
 * and only allows pre-registered query hashes (APQ protocol).
 * OWASP API4 — prevents untrusted clients from sending arbitrary queries.
 */
import { registerQuery, lookupQuery, isRegistered } from './registry.js';

const PERSISTED_QUERIES_ONLY =
  process.env['PERSISTED_QUERIES_ONLY'] === 'true' ||
  (process.env['NODE_ENV'] === 'production' &&
    process.env['PERSISTED_QUERIES_ONLY'] !== 'false');

interface PersistedQueryExtension {
  sha256Hash?: string;
  version?: number;
}

interface RequestBody {
  query?: string;
  extensions?: {
    persistedQuery?: PersistedQueryExtension;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function errorResponse(
  status: number,
  code: string,
  message: string
): Response {
  return new Response(
    JSON.stringify({
      errors: [{ message, extensions: { code } }],
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Apply APQ middleware logic to an incoming request body.
 * Returns a Response to short-circuit if the request must be rejected,
 * or null to allow the (possibly mutated) body to continue to Yoga.
 *
 * Side effects:
 *  - If both hash and query are present: registers the mapping for future use.
 *  - If only hash is present and registered: replaces body.query with stored query.
 *  - If only hash is present and NOT registered: rejects with 400.
 *  - If no hash and PERSISTED_QUERIES_ONLY=true: rejects with 400.
 */
export function applyPersistedQueryMiddleware(
  _request: Request,
  body: RequestBody
): Response | null {
  const hash = body.extensions?.persistedQuery?.sha256Hash;
  const query = body.query;

  // Client sends both hash and full query → register and proceed
  if (hash && query) {
    registerQuery(hash, query);
    return null;
  }

  // Client sends only the hash (standard APQ flow)
  if (hash) {
    if (isRegistered(hash)) {
      // Substitute stored query so Yoga sees a full document
      body.query = lookupQuery(hash);
      return null;
    }
    // Hash not in registry → APQ miss (client must retry with full query)
    return errorResponse(
      400,
      'PERSISTED_QUERY_NOT_FOUND',
      'PersistedQueryNotFound: hash not registered. Retry with full query document.'
    );
  }

  // No hash at all
  if (PERSISTED_QUERIES_ONLY) {
    return errorResponse(
      400,
      'PERSISTED_QUERIES_REQUIRED',
      'Only persisted queries are accepted in this environment.'
    );
  }

  // Hash-less requests allowed in dev/non-strict mode
  return null;
}

/** Expose the resolved flag for observability and tests. */
export { PERSISTED_QUERIES_ONLY };
