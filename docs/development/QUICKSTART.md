# EduSphere - Quickstart Guide

**GraphQL Federation Learning Platform**
6 Subgraphs + PostgreSQL + pgvector + Single Docker Container

---

## 🚀 Quick Start - Single Command

```bash
# Build and run the entire platform in one Docker container
docker build -t edusphere .
docker run -d -p 4000-4006:4000-4006 -p 5432:5432 --name edusphere edusphere
```

That's it! All services are now running.

---

## 📦 What's Running?

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Gateway** | 4000 | http://localhost:4000/graphql | GraphQL Federation Gateway (Hive v2.7) |
| **Core Subgraph** | 4001 | http://localhost:4001/graphql | Users, Auth, Tenants |
| **Content Subgraph** | 4002 | http://localhost:4002/graphql | Courses, Modules, ContentItems |
| **Annotation Subgraph** | 4003 | http://localhost:4003/graphql | Highlights, Notes, Questions |
| **Collaboration Subgraph** | 4004 | http://localhost:4004/graphql | Discussions, Comments |
| **Agent Subgraph** | 4005 | http://localhost:4005/graphql | AI Sessions & Messages |
| **Knowledge Subgraph** | 4006 | http://localhost:4006/graphql | Embeddings + Semantic Search |
| **PostgreSQL 16** | 5432 | localhost:5432 | Database + pgvector + Apache AGE |
| **Redis** | 6379 | localhost:6379 | Cache & Sessions |
| **NATS JetStream** | 4222 | localhost:4222 | Event Streaming |
| **MinIO** | 9000/9001 | http://localhost:9000 | Object Storage |
| **Keycloak** | 8080 | http://localhost:8080 | Authentication |
| **Ollama** | 11434 | http://localhost:11434 | Local LLM Server |

---

## 🎯 Access the Platform

### GraphQL Playground
```bash
# Open in browser
open http://localhost:4000/graphql
```

### Example Query (All 6 Subgraphs)
```graphql
{
  # Core Subgraph
  me {
    id
    email
    firstName
    lastName
    role

    # Content Subgraph (Federation!)
    courses {
      id
      title
      description
      isPublished

      # Modules from Content Subgraph
      modules {
        id
        title
        contentItems {
          id
          title
          type
        }
      }
    }

    # Annotations Subgraph
    annotations {
      id
      type
      content
      targetId
    }

    # Collaboration Subgraph
    discussions {
      id
      title
      content
      upvotes
      replies {
        id
        content
      }
    }

    # Agent Subgraph (AI Tutor)
    agentSessions {
      id
      status
      messages {
        id
        role
        content
      }
    }
  }

  # Knowledge Subgraph - Semantic Search
  semanticSearch(query: "explain quantum computing", limit: 5) {
    embedding {
      id
      content
    }
    similarity
  }
}
```

---

## 🏗️ Architecture

### GraphQL Federation v2
```
┌─────────────────────────────────────────────────┐
│          Hive Gateway (Port 4000)              │
│            Federation v2 Router                │
└────────────┬────────────────────────────────────┘
             │
     ┌───────┴───────┐
     │               │
┌────▼────┐    ┌────▼────────────────────────┐
│  Core   │    │  Content  │  Annotation    │
│ (4001)  │    │  (4002)   │  (4003)        │
└─────────┘    └───────────┴────────────────┘
               ┌────────────────────────────┐
               │  Collaboration │  Agent    │
               │  (4004)        │  (4005)   │
               └────────────────┴───────────┘
               ┌────────────────────────────┐
               │  Knowledge (4006)          │
               │  pgvector + Semantic Search│
               └────────────────────────────┘
                        │
                ┌───────▼────────┐
                │  PostgreSQL 16 │
                │  + pgvector    │
                │  + Apache AGE  │
                └────────────────┘
```

### Single Container - All Services
- **supervisord** manages all 13 processes
- **PostgreSQL 16** with pgvector (HNSW) + Apache AGE (graph)
- **6 NestJS Subgraphs** (GraphQL Yoga Federation)
- **Hive Gateway** (MIT-licensed federation v2)
- **All infrastructure** (Redis, NATS, MinIO, Keycloak, Ollama)

---

## 🔧 Development Mode

### Local Development (without Docker)
```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL (or use Docker)
docker run -d \
  -e POSTGRES_USER=edusphere \
  -e POSTGRES_PASSWORD=edusphere_dev_password \
  -e POSTGRES_DB=edusphere \
  -p 5432:5432 \
  postgres:16

# 3. Install pgvector
docker exec -it <container_id> bash
su - postgres
psql -d edusphere
CREATE EXTENSION vector;
CREATE EXTENSION age;

# 4. Run migrations
cd packages/db
pnpm run db:push

# 5. Start all subgraphs in parallel (use separate terminals)
cd apps/subgraph-core && pnpm dev          # Port 4001
cd apps/subgraph-content && pnpm dev       # Port 4002
cd apps/subgraph-annotation && pnpm dev    # Port 4003
cd apps/subgraph-collaboration && pnpm dev # Port 4004
cd apps/subgraph-agent && pnpm dev         # Port 4005
cd apps/subgraph-knowledge && pnpm dev     # Port 4006

# 6. Start gateway
cd apps/gateway && pnpm dev                # Port 4000
```

### Or use Turborepo (all at once)
```bash
# Start all 6 subgraphs + gateway
pnpm run dev

# Build all
pnpm run build

# Type check all
pnpm run typecheck
```

---

## 📊 Database Schema

### 16 Tables with Row-Level Security (RLS)

**Core Domain (Port 4001):**
- `users` - User accounts
- `tenants` - Multi-tenancy
- `tenant_memberships` - User-tenant relations

**Content Domain (Port 4002):**
- `courses` - Course catalog
- `modules` - Course modules
- `content_items` - Learning materials
- `enrollments` - Student enrollments
- `progress_tracking` - Learning progress

**Annotation Domain (Port 4003):**
- `annotations` - Highlights, notes, questions, bookmarks

**Collaboration Domain (Port 4004):**
- `discussions` - Threaded discussions with upvotes

**Agent Domain (Port 4005):**
- `agent_sessions` - AI tutor conversations
- `agent_messages` - Chat history

**Knowledge Domain (Port 4006):**
- `embeddings` - Vector embeddings (768-dim)
- `knowledge_items` - Metadata
- `semantic_links` - Graph relationships

All tables have:
- ✅ Row-Level Security (RLS)
- ✅ Tenant isolation (`tenant_id`)
- ✅ Timestamps (`created_at`, `updated_at`)
- ✅ UUIDs (`id`)

---

## 🧪 Testing

### GraphQL Federation
```bash
# Test subgraph schemas
cd apps/subgraph-core
pnpm test

# Test gateway composition
cd apps/gateway
pnpm run compose
```

### Semantic Search (Knowledge Subgraph)
```graphql
mutation {
  createEmbedding(input: {
    content: "Quantum computing uses qubits and superposition"
    embedding: [0.1, 0.2, ..., 0.5]  # 768-dimensional vector
    sourceType: "COURSE"
    sourceId: "course-123"
    tenantId: "tenant-1"
  }) {
    id
    content
  }
}

query {
  semanticSearch(
    queryVector: [0.1, 0.2, ..., 0.5]
    limit: 10
    minSimilarity: 0.7
  ) {
    embedding {
      id
      content
    }
    similarity    # Cosine similarity (0-1)
    distance      # Vector distance
  }
}
```

---

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design & decisions
- **[PHASE_IMPLEMENTATION_LOG.md](./PHASE_IMPLEMENTATION_LOG.md)** - Implementation phases
- **[packages/db/README.md](./packages/db/README.md)** - Database schema
- **[infrastructure/README.md](./infrastructure/README.md)** - Docker setup

---

## 🎓 Key Features

### 1. GraphQL Federation v2
- ✅ 6 independent subgraphs
- ✅ Type sharing with `@key` directives
- ✅ Seamless cross-subgraph queries
- ✅ Hive Gateway v2.7 (MIT-licensed)

### 2. Vector Search (pgvector)
- ✅ 768-dimensional embeddings
- ✅ HNSW index for fast search
- ✅ Cosine similarity scoring
- ✅ Multi-tenant isolation

### 3. Multi-Tenancy
- ✅ Row-Level Security (RLS) on all tables
- ✅ Automatic tenant isolation
- ✅ Tenant-scoped queries

### 4. Single Docker Container
- ✅ All services in one container
- ✅ supervisord process management
- ✅ Auto-restart on failure
- ✅ Health checks

---

## 🔒 Security

### Database (Row-Level Security)
```sql
-- Example RLS policy (automatically applied)
CREATE POLICY tenant_isolation ON courses
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Authentication
- **Keycloak** for OAuth 2.0 / OIDC
- **JWT tokens** with tenant claims
- **Role-based access control** (SUPER_ADMIN, ORG_ADMIN, INSTRUCTOR, STUDENT, RESEARCHER)

---

## 📈 Monitoring

### Health Checks
```bash
# Gateway health
curl http://localhost:4000/health

# PostgreSQL
docker exec edusphere pg_isready -U edusphere

# All services (supervisorctl)
docker exec -it edusphere supervisorctl status
```

### Logs
```bash
# All logs
docker logs -f edusphere

# Specific service
docker exec edusphere tail -f /var/log/edusphere/subgraph-core.log
docker exec edusphere tail -f /var/log/edusphere/gateway.log
```

---

## 🚢 Deployment

### Production Build
```bash
docker build -t edusphere:latest .
docker tag edusphere:latest registry.example.com/edusphere:v1.0.0
docker push registry.example.com/edusphere:v1.0.0
```

### Environment Variables
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=https://app.example.com
LOG_LEVEL=info
```

---

## 🤝 Contributing

See [ARCHITECTURE.md](./ARCHITECTURE.md) for:
- Code organization
- Naming conventions
- Development workflow
- Testing guidelines

---

## 📄 License

MIT - See [LICENSE](./LICENSE) for details.

---

**Built with:**
- [NestJS](https://nestjs.com) - GraphQL subgraphs
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) - Federation
- [Hive Gateway](https://the-guild.dev/graphql/hive/docs/gateway) - Router
- [Drizzle ORM](https://orm.drizzle.team) - Type-safe queries
- [PostgreSQL 16](https://www.postgresql.org) - Database
- [pgvector](https://github.com/pgvector/pgvector) - Vector search
- [pnpm](https://pnpm.io) + [Turborepo](https://turbo.build/repo) - Monorepo
