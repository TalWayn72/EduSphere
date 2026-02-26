# @edusphere/frontend-client

**React Frontend Client for EduSphere GraphQL Federation**

## Features

- ✅ Apollo Client 3.x (GraphQL Federation v2)
- ✅ React 18 + TypeScript 5
- ✅ Vite 6 (Fast dev server + HMR)
- ✅ React Router v7 (Client-side routing)
- ✅ Real-time GraphQL subscriptions
- ✅ Responsive design

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_GATEWAY_URL=http://localhost:4000/graphql
VITE_WS_URL=ws://localhost:4000/graphql
```

## Architecture

```
src/
├── components/
│   ├── CourseList.tsx      # List all courses
│   ├── CourseDetail.tsx    # Course details with modules
│   └── AITutor.tsx         # AI chatbot interface
├── App.tsx                 # Main app component
└── index.tsx               # Entry point + Apollo setup
```

## GraphQL Queries

### Courses

```graphql
query Courses {
  courses(limit: 20) {
    id
    title
    description
    isPublished
  }
}
```

### AI Tutor

```graphql
mutation CreateSession {
  createAgentSession(input: { userId: $userId, agentType: "TUTOR" }) {
    id
  }
}
```

## Development

Access the app at: http://localhost:5173

The Vite dev server proxies `/graphql` requests to the Gateway at `http://localhost:4000`.

## Production Build

```bash
pnpm build
```

Output: `dist/`

Serve with any static file server:

```bash
npx serve -s dist
```

## Integration with Gateway

The client connects to the GraphQL Gateway (port 4000) which federates all 6 subgraphs:

- Core (Users, Auth)
- Content (Courses, Modules)
- Annotation (Notes, Highlights)
- Collaboration (Discussions)
- Agent (AI Tutor)
- Knowledge (Semantic Search)

## Technologies

- **React 18** - UI library
- **TypeScript 5** - Type safety
- **Vite 6** - Build tool
- **Apollo Client 3** - GraphQL client
- **React Router 7** - Routing
