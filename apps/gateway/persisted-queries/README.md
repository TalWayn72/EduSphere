# Persisted GraphQL Queries — EduSphere Gateway

## Overview

Persisted queries (also called trusted documents) replace arbitrary GraphQL query strings
with short opaque identifiers (hashes). In production, the gateway accepts **only** queries
that appear in the pre-approved manifest, preventing query injection and reducing network payload.

## Architecture

```
Client (web / mobile)                  Gateway (Hive Gateway v2)
─────────────────────                  ─────────────────────────
{ "id": "sha256:abc123" }  ──────────► look up query text in manifest
                                        run query if found
                                        reject with 400 if not found
```

## Generating the Persisted Query Manifest

### Step 1 — Extract all operations from the client codebase

The frontend uses `graphql-request` or `urql`. All `.graphql` files under
`apps/web/src/` and `apps/mobile/src/` contain the operation definitions.

```bash
# Install the Hive CLI (already in devDependencies of apps/gateway)
pnpm add -D @graphql-hive/cli

# Generate the manifest from all .graphql files in the monorepo
pnpm hive persisted-documents collect \
  --client-name "edusphere-web" \
  --client-version "$(git rev-parse --short HEAD)" \
  apps/web/src/**/*.graphql \
  apps/mobile/src/**/*.graphql \
  --output apps/gateway/persisted-queries/manifest.json
```

### Step 2 — Upload the manifest to GraphQL Hive

```bash
# Requires HIVE_TOKEN env var (set in CI secrets)
pnpm hive persisted-documents publish \
  --token "$HIVE_TOKEN" \
  apps/gateway/persisted-queries/manifest.json
```

### Step 3 — Verify the manifest locally

```bash
# Inspect the generated manifest
cat apps/gateway/persisted-queries/manifest.json | jq 'keys | length'
# Should print the number of unique operations
```

## Manifest Format

The manifest is a JSON object mapping SHA-256 hashes to query strings:

```json
{
  "sha256:abc123...": "query GetUser($id: ID!) { user(id: $id) { id name email } }",
  "sha256:def456...": "mutation UpdateProfile($input: UpdateProfileInput!) { ... }"
}
```

## Gateway Configuration

The gateway config in `apps/gateway/gateway.config.ts` is pre-configured with
persisted query support. Key settings:

- **Development (`NODE_ENV !== 'production'`):** arbitrary queries allowed (manifest optional)
- **Production (`NODE_ENV === 'production'`):** only manifest queries accepted (`allowArbitraryDocuments: false`)

## Client-Side Integration

### React (apps/web) — graphql-request

```typescript
// src/lib/graphql-client.ts
import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient(import.meta.env.VITE_GRAPHQL_URL, {
  // Send persisted query hash instead of full query text
  // Matches the manifest hash format used by Hive Gateway
  requestMiddleware: (request) => {
    if (request.operationName) {
      return {
        ...request,
        body: JSON.stringify({
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: request.operationName, // hash pre-computed at build time
            },
          },
        }),
      };
    }
    return request;
  },
});
```

### Expo Mobile (apps/mobile)

Same pattern as above — share the hash map via `packages/graphql-types`.

## CI/CD Integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Generate persisted query manifest
  run: |
    pnpm hive persisted-documents collect \
      --output apps/gateway/persisted-queries/manifest.json \
      apps/web/src/**/*.graphql apps/mobile/src/**/*.graphql

- name: Publish persisted queries to Hive
  if: github.ref == 'refs/heads/main'
  env:
    HIVE_TOKEN: ${{ secrets.HIVE_TOKEN }}
  run: pnpm hive persisted-documents publish \
         --token "$HIVE_TOKEN" \
         apps/gateway/persisted-queries/manifest.json
```

## Security Notes

- Never commit `manifest.json` with sensitive field names as operation names.
- Rotate the manifest on every production deploy (new hash per query version).
- The gateway rejects queries not in the manifest with HTTP 400 (not 401) to
  avoid leaking schema information to unauthenticated callers.
- Combine with query depth limiting (max 10) and complexity limiting (max 1000)
  already configured in `gateway.config.ts`.
