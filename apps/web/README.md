# EduSphere Web Frontend

React 19 + Vite 6 frontend application for the EduSphere Knowledge Graph Educational Platform.

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite 6
- **GraphQL Client:** urql with GraphQL subscriptions
- **Authentication:** Keycloak OIDC
- **Routing:** React Router v6
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS
- **TypeScript:** Strict mode

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Running EduSphere infrastructure (Gateway, Keycloak)

### Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure environment variables:
```env
VITE_GRAPHQL_URL=http://localhost:4000/graphql
VITE_GRAPHQL_WS_URL=ws://localhost:4000/graphql
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=edusphere
VITE_KEYCLOAK_CLIENT_ID=edusphere-app
```

### Development

```bash
# Install dependencies (from project root)
pnpm install

# Start dev server
pnpm --filter @edusphere/web dev

# Or from this directory
pnpm dev
```

The app will be available at http://localhost:5173

### Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e
```

### Linting

```bash
# Lint code
pnpm lint

# Type check
pnpm typecheck
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── Layout.tsx      # Main layout wrapper
│   └── ProtectedRoute.tsx
├── pages/              # Route pages
│   ├── Login.tsx
│   └── Dashboard.tsx
├── lib/                # Core utilities
│   ├── auth.ts         # Keycloak integration
│   ├── urql-client.ts  # GraphQL client
│   ├── queries.ts      # GraphQL queries
│   └── utils.ts        # Helper functions
├── hooks/              # Custom React hooks
├── styles/             # Global styles
│   └── globals.css
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── vite-env.d.ts       # TypeScript declarations
```

## Authentication Flow

1. App initializes Keycloak on mount
2. User navigates to protected route
3. ProtectedRoute checks authentication status
4. If not authenticated, redirects to /login
5. Login page triggers Keycloak SSO flow
6. On success, JWT token stored in Keycloak instance
7. urql client adds token to Authorization header
8. User redirected to Dashboard

## GraphQL Integration

The app uses urql with the following exchanges:
- **Cache Exchange:** GraphQL response caching
- **Fetch Exchange:** HTTP requests to Gateway
- **Subscription Exchange:** WebSocket for real-time updates

All GraphQL queries automatically include JWT authentication header.

## UI Components

Uses shadcn/ui components built on Radix UI primitives:
- Accessible by default
- Fully customizable with Tailwind
- Dark mode ready

## Path Aliases

The `@/*` alias maps to `src/*`:
```typescript
import { Button } from '@/components/ui/button';
import { urqlClient } from '@/lib/urql-client';
```

## Security

- All routes except /login require authentication
- JWT tokens auto-refresh every 60 seconds
- Tokens validated by Gateway against Keycloak
- XSS protection via React's built-in escaping
- CSRF protection via SameSite cookies (Keycloak)

## Performance

- Code splitting via React Router lazy loading
- Tree shaking enabled in production
- Optimized Tailwind CSS bundle
- urql caching reduces redundant requests
- WebSocket connection for subscriptions

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Related Documentation

- [API Contracts](../../API_CONTRACTS_GRAPHQL_FEDERATION.md)
- [Implementation Roadmap](../../IMPLEMENTATION_ROADMAP.md)
- [Claude Instructions](../../CLAUDE.md)
