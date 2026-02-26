# Development Mode - Frontend Without Infrastructure

## Overview

The EduSphere frontend supports a **Development Mode** that allows running the application without requiring full infrastructure (Docker, Keycloak, PostgreSQL, etc.).

This is useful for:

- ✅ Frontend development without backend dependencies
- ✅ UI/UX iterations and component development
- ✅ Quick prototyping and demos
- ✅ Working offline or without Docker Desktop

## How It Works

When `VITE_DEV_MODE=true` is set in `.env`, the application:

1. **Bypasses Keycloak authentication** - no redirect to localhost:8080
2. **Uses a mock authenticated user** with SUPER_ADMIN role
3. **Provides a mock JWT token** for GraphQL client
4. **Auto-authenticates** on app load
5. **Falls back to dev mode** if Keycloak initialization fails

## Configuration

### Enable Dev Mode

Edit `apps/web/.env`:

```bash
VITE_DEV_MODE=true
```

### Disable Dev Mode (Production)

```bash
VITE_DEV_MODE=false
# or remove the line entirely
```

## Mock User Details

When dev mode is active, the following user is automatically authenticated:

```typescript
{
  id: 'dev-user-1',
  username: 'developer',
  email: 'dev@edusphere.local',
  firstName: 'Dev',
  lastName: 'User',
  tenantId: 'dev-tenant-1',
  role: 'SUPER_ADMIN',
  scopes: ['read', 'write', 'admin']
}
```

## Visual Indicator

When running in dev mode, the browser console will show:

```
🔧 DEV MODE: Running without Keycloak authentication
```

## GraphQL Queries

**Important:** Dev mode only affects authentication. GraphQL queries to the Gateway will still fail if:

- Gateway is not running on http://localhost:4000
- Subgraphs are not running
- Database is not available

For full functionality, you still need the backend services running.

## When to Use Dev Mode

✅ **Good for:**

- Developing UI components
- Testing layouts and styles
- Working on client-side routing
- Building forms and validation
- Prototyping new features

❌ **Not suitable for:**

- Testing authentication flows
- Testing real GraphQL queries
- Testing multi-tenant isolation
- Testing role-based access control
- Integration testing

## Production Considerations

**Dev mode is automatically disabled in production** when:

- `VITE_DEV_MODE` is not set or set to `false`
- `VITE_KEYCLOAK_URL` is properly configured

Never deploy to production with `VITE_DEV_MODE=true`!

## Fallback Behavior

If Keycloak initialization fails (e.g., Keycloak server is down), the app will automatically:

1. Log a warning to console
2. Enable dev mode as fallback
3. Continue running with mock authentication

This ensures the frontend is resilient during development.

## Code Implementation

The dev mode logic is implemented in `src/lib/auth.ts`:

```typescript
const DEV_MODE =
  import.meta.env.VITE_DEV_MODE === 'true' ||
  !import.meta.env.VITE_KEYCLOAK_URL;
```

All auth functions (`login`, `logout`, `getToken`, `isAuthenticated`, `getCurrentUser`) check for dev mode and return mock data accordingly.

## Testing Real Authentication

To test real Keycloak authentication:

1. Start infrastructure:

   ```bash
   docker compose -f docker-compose.dev.yml up -d postgres keycloak
   ```

2. Disable dev mode in `.env`:

   ```bash
   VITE_DEV_MODE=false
   ```

3. Restart frontend:

   ```bash
   pnpm dev
   ```

4. Access http://localhost:5173 - should redirect to Keycloak login

## Security

Dev mode is a **development-only feature**. Security considerations:

- ✅ Mock user has SUPER_ADMIN role (full access for testing)
- ✅ Mock token is just a string (not a valid JWT)
- ✅ No real credentials stored or transmitted
- ✅ Disabled automatically in production builds
- ⚠️ **Never expose dev mode in production!**

---

**Created:** February 2026
**Purpose:** Enable frontend development without full infrastructure
**Status:** Production-ready pattern for local development
