# EduSphere - Single Container Deployment

## ✅ All-in-One Architecture

**כל EduSphere פועל בתוך Docker container אחד.**

### מה כלול ב-Container:

- **PostgreSQL 16** + Apache AGE + pgvector (port 5432)
- **Redis 7** (port 6379)
- **NATS JetStream** (ports 4222, 8222)
- **MinIO** S3 storage (ports 9000, 9001)
- **Keycloak 26** OIDC (port 8080)
- **Ollama** LLM (port 11434)
- **GraphQL Gateway** (port 4000)
- **6 Subgraphs** (ports 4001-4006)

### Architecture Diagram

```mermaid
graph TD
    subgraph "Single Docker Container"
        SUPERVISOR[supervisord<br/>Process Manager]

        SUPERVISOR --> PG[(PostgreSQL 16<br/>AGE + pgvector<br/>Port 5432)]
        SUPERVISOR --> REDIS[Redis 7<br/>Port 6379]
        SUPERVISOR --> NATS[NATS JetStream<br/>Port 4222]
        SUPERVISOR --> MINIO[(MinIO<br/>Port 9000)]
        SUPERVISOR --> KC[Keycloak 26<br/>Port 8080]
        SUPERVISOR --> OLLAMA[Ollama LLM<br/>Port 11434]
        SUPERVISOR --> GW[GraphQL Gateway<br/>Port 4000]
        SUPERVISOR --> SUBS[6 Subgraphs<br/>Ports 4001-4006]
    end

    CLIENT[Browser / Mobile] --> GW
    GW --> SUBS
    SUBS --> PG
    SUBS --> MINIO
    SUBS -.-> NATS
    GW -.-> KC

    classDef manager fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef service fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#ffccbc,stroke:#d84315,stroke-width:2px
    classDef infra fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef external fill:#e1f5ff,stroke:#01579b,stroke-width:2px

    class SUPERVISOR manager
    class GW,SUBS service
    class PG,REDIS,MINIO data
    class NATS,KC,OLLAMA infra
    class CLIENT external
```

---

## 🚀 Quick Start

```bash
# Build image
docker-compose build

# Start container
docker-compose up -d

# Check status
curl http://localhost:4000/health

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🌐 Access Services

| Service         | URL                           | Credentials                        |
| --------------- | ----------------------------- | ---------------------------------- |
| GraphQL Gateway | http://localhost:4000/graphql | -                                  |
| Keycloak Admin  | http://localhost:8080         | admin / admin                      |
| MinIO Console   | http://localhost:9001         | minioadmin / minioadmin            |
| PostgreSQL      | localhost:5432                | edusphere / edusphere_dev_password |

---

## 📦 Data Persistence

Data stored in Docker volumes:

- `postgres_data` - PostgreSQL database
- `keycloak_data` - Keycloak configuration
- `minio_data` - Object storage
- `ollama_data` - LLM models

---

## 🔧 Development

### Hot Reload:

Uncomment in `docker-compose.yml`:

```yaml
volumes:
  - ./apps:/app/apps
  - ./packages:/app/packages
```

### Check Processes:

```bash
docker exec -it edusphere-all-in-one supervisorctl status
```

---

## 🌍 Production Deployment

```bash
# Build production image
docker build -t edusphere:prod .

# Run on any cloud (AWS/Azure/GCP) or on-premise
docker run -d \
  --name edusphere \
  --restart always \
  -p 80:4000 \
  -v /data:/var/lib/postgresql/16/main \
  edusphere:prod
```

---

## 🎁 Benefits

✅ **One command deployment** - `docker run`
✅ **Cloud-agnostic** - Run anywhere
✅ **Cost-effective** - Single VM
✅ **Perfect for:** Edge, SMB, Development

---

**Ready!** Run: `./scripts/run-docker.sh`
