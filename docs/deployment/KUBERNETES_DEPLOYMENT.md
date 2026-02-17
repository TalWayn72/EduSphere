# Kubernetes Deployment Guide

## Table of Contents
1. [Cluster Requirements](#1-cluster-requirements)
2. [Namespace Setup](#2-namespace-setup)
3. [ConfigMaps & Secrets](#3-configmaps--secrets)
4. [PostgreSQL StatefulSet](#4-postgresql-statefulset)
5. [Keycloak Deployment](#5-keycloak-deployment)
6. [NATS Cluster](#6-nats-cluster)
7. [MinIO Deployment](#7-minio-deployment)
8. [Jaeger](#8-jaeger)
9. [Gateway Deployment](#9-gateway-deployment)
10. [Subgraph Deployments](#10-subgraph-deployments)
11. [Frontend Deployment](#11-frontend-deployment)
12. [Traefik Ingress](#12-traefik-ingress)
13. [HPA & PDB Configuration](#13-hpa--pdb-configuration)
14. [Network Policies](#14-network-policies)
15. [Monitoring](#15-monitoring)
16. [Helm Charts](#16-helm-charts)
17. [CI/CD Pipeline](#17-cicd-pipeline)
18. [Zero-Downtime Updates](#18-zero-downtime-updates)
19. [Disaster Recovery](#19-disaster-recovery)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Cluster Requirements

### Minimum Kubernetes Version
- Kubernetes 1.28+
- kubectl 1.28+
- Helm 3.12+

### Node Requirements

#### Production Cluster
```yaml
Node Pool Configuration:
  - Control Plane Nodes: 3 nodes
    - CPU: 4 cores
    - Memory: 16 GB
    - Disk: 100 GB SSD

  - Application Nodes: 6+ nodes
    - CPU: 8 cores
    - Memory: 32 GB
    - Disk: 200 GB SSD
    - Taints: workload=application:NoSchedule

  - Database Nodes: 3 nodes
    - CPU: 16 cores
    - Memory: 64 GB
    - Disk: 500 GB NVMe SSD
    - Taints: workload=database:NoSchedule

  - Storage Nodes: 3 nodes
    - CPU: 4 cores
    - Memory: 16 GB
    - Disk: 1 TB SSD
    - Taints: workload=storage:NoSchedule
```

#### Development Cluster
```yaml
Node Pool Configuration:
  - Control Plane: 1 node
    - CPU: 2 cores
    - Memory: 8 GB

  - Worker Nodes: 3 nodes
    - CPU: 4 cores
    - Memory: 16 GB
```

### Storage Requirements

```yaml
Storage Classes:
  - fast-ssd:
      provisioner: kubernetes.io/aws-ebs  # or equivalent
      type: gp3
      iopsPerGB: "50"
      throughput: "125"
      fsType: ext4

  - database-storage:
      provisioner: kubernetes.io/aws-ebs
      type: io2
      iopsPerGB: "100"
      throughput: "250"
      fsType: ext4

  - object-storage:
      provisioner: kubernetes.io/aws-ebs
      type: gp3
      iopsPerGB: "30"
      throughput: "125"
      fsType: ext4
```

### Required Add-ons
- **Metrics Server**: For HPA
- **CSI Driver**: For persistent volumes
- **CNI Plugin**: Calico/Cilium for network policies
- **DNS**: CoreDNS
- **Ingress Controller**: Traefik 2.10+

### Resource Quotas (Production)
```yaml
Total Cluster Capacity:
  CPU: 192+ cores
  Memory: 768+ GB
  Storage: 5+ TB

EduSphere Allocation:
  CPU: 128 cores
  Memory: 512 GB
  Storage: 3 TB
  Pods: 500
```

---

## 2. Namespace Setup

### Create Namespaces

```bash
# Create namespaces
kubectl create namespace edusphere-prod
kubectl create namespace edusphere-monitoring
kubectl create namespace edusphere-ingress
kubectl create namespace edusphere-storage
```

### Namespace Configuration

```yaml
# namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: edusphere-prod
  labels:
    name: edusphere-prod
    environment: production
    istio-injection: disabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: edusphere-monitoring
  labels:
    name: edusphere-monitoring
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: edusphere-ingress
  labels:
    name: edusphere-ingress
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: edusphere-storage
  labels:
    name: edusphere-storage
    environment: production
```

### Resource Quotas per Namespace

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: edusphere-quota
  namespace: edusphere-prod
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 400Gi
    limits.cpu: "128"
    limits.memory: 512Gi
    persistentvolumeclaims: "50"
    pods: "400"
    services: "50"
    services.loadbalancers: "5"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: edusphere-limits
  namespace: edusphere-prod
spec:
  limits:
  - max:
      cpu: "8"
      memory: 16Gi
    min:
      cpu: 100m
      memory: 128Mi
    default:
      cpu: "1"
      memory: 1Gi
    defaultRequest:
      cpu: 500m
      memory: 512Mi
    type: Container
```

### Apply Namespace Configuration

```bash
kubectl apply -f namespaces.yaml
kubectl apply -f resource-quota.yaml
```

---

## 3. ConfigMaps & Secrets

### Environment ConfigMaps

```yaml
# configmap-env.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edusphere-config
  namespace: edusphere-prod
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"

  # Database
  DB_HOST: "postgresql.edusphere-prod.svc.cluster.local"
  DB_PORT: "5432"
  DB_NAME: "edusphere"
  DB_MAX_CONNECTIONS: "100"
  DB_IDLE_TIMEOUT: "10000"
  DB_SSL_MODE: "require"

  # NATS
  NATS_URL: "nats://nats.edusphere-prod.svc.cluster.local:4222"
  NATS_CLUSTER_ID: "edusphere-cluster"
  NATS_CLIENT_ID_PREFIX: "edusphere"

  # MinIO
  MINIO_ENDPOINT: "minio.edusphere-storage.svc.cluster.local"
  MINIO_PORT: "9000"
  MINIO_USE_SSL: "false"
  MINIO_BUCKET: "edusphere-uploads"

  # Keycloak
  KEYCLOAK_URL: "http://keycloak.edusphere-prod.svc.cluster.local:8080"
  KEYCLOAK_REALM: "edusphere"

  # Jaeger
  JAEGER_AGENT_HOST: "jaeger-agent.edusphere-monitoring.svc.cluster.local"
  JAEGER_AGENT_PORT: "6831"
  JAEGER_SAMPLER_TYPE: "probabilistic"
  JAEGER_SAMPLER_PARAM: "0.1"

  # Gateway
  GATEWAY_PORT: "4000"
  GRAPHQL_INTROSPECTION: "false"
  GRAPHQL_PLAYGROUND: "false"

  # CORS
  CORS_ORIGIN: "https://edusphere.example.com"
  CORS_CREDENTIALS: "true"

  # Redis (for rate limiting)
  REDIS_HOST: "redis.edusphere-prod.svc.cluster.local"
  REDIS_PORT: "6379"

  # Service URLs
  USER_SERVICE_URL: "http://user-service.edusphere-prod.svc.cluster.local:4001"
  COURSE_SERVICE_URL: "http://course-service.edusphere-prod.svc.cluster.local:4002"
  ENROLLMENT_SERVICE_URL: "http://enrollment-service.edusphere-prod.svc.cluster.local:4003"
  CONTENT_SERVICE_URL: "http://content-service.edusphere-prod.svc.cluster.local:4004"
  ASSESSMENT_SERVICE_URL: "http://assessment-service.edusphere-prod.svc.cluster.local:4005"
  NOTIFICATION_SERVICE_URL: "http://notification-service.edusphere-prod.svc.cluster.local:4006"
```

### Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: edusphere-secrets
  namespace: edusphere-prod
type: Opaque
stringData:
  # Database
  DB_USER: "edusphere_user"
  DB_PASSWORD: "CHANGEME_DB_PASSWORD"
  DB_ADMIN_PASSWORD: "CHANGEME_ADMIN_PASSWORD"

  # MinIO
  MINIO_ACCESS_KEY: "CHANGEME_MINIO_ACCESS_KEY"
  MINIO_SECRET_KEY: "CHANGEME_MINIO_SECRET_KEY"

  # Keycloak
  KEYCLOAK_ADMIN_USER: "admin"
  KEYCLOAK_ADMIN_PASSWORD: "CHANGEME_KEYCLOAK_ADMIN"
  KEYCLOAK_CLIENT_SECRET: "CHANGEME_CLIENT_SECRET"

  # JWT
  JWT_SECRET: "CHANGEME_JWT_SECRET_MIN_32_CHARS"
  JWT_REFRESH_SECRET: "CHANGEME_REFRESH_SECRET_MIN_32_CHARS"

  # Encryption Keys
  ENCRYPTION_KEY: "CHANGEME_ENCRYPTION_KEY_32_BYTES"

  # Redis
  REDIS_PASSWORD: "CHANGEME_REDIS_PASSWORD"

  # AGE Encryption (for database)
  AGE_SECRET_KEY: "CHANGEME_AGE_SECRET_KEY"
  AGE_PUBLIC_KEY: "CHANGEME_AGE_PUBLIC_KEY"
```

### Create Secrets Securely

```bash
# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
MINIO_ACCESS_KEY=$(openssl rand -hex 20)
MINIO_SECRET_KEY=$(openssl rand -base64 40)
JWT_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Create secret
kubectl create secret generic edusphere-secrets \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --from-literal=MINIO_ACCESS_KEY="$MINIO_ACCESS_KEY" \
  --from-literal=MINIO_SECRET_KEY="$MINIO_SECRET_KEY" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  --namespace=edusphere-prod

# Apply ConfigMap
kubectl apply -f configmap-env.yaml
```

### TLS Certificates

```yaml
# tls-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: edusphere-tls
  namespace: edusphere-ingress
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # Base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # Base64 encoded private key
```

```bash
# Create TLS secret from cert files
kubectl create secret tls edusphere-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace=edusphere-ingress
```

---

## 4. PostgreSQL StatefulSet

### PostgreSQL with AGE + pgvector

```yaml
# postgresql-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: edusphere-prod
  labels:
    app: postgresql
spec:
  ports:
  - port: 5432
    name: postgres
  clusterIP: None
  selector:
    app: postgresql
---
apiVersion: v1
kind: Service
metadata:
  name: postgresql-headless
  namespace: edusphere-prod
  labels:
    app: postgresql
spec:
  ports:
  - port: 5432
    name: postgres
  clusterIP: None
  selector:
    app: postgresql
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: edusphere-prod
spec:
  serviceName: postgresql-headless
  replicas: 3
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      nodeSelector:
        workload: database
      tolerations:
      - key: workload
        operator: Equal
        value: database
        effect: NoSchedule
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - postgresql
            topologyKey: kubernetes.io/hostname
      initContainers:
      - name: init-permissions
        image: busybox:1.36
        command:
        - sh
        - -c
        - |
          chown -R 999:999 /var/lib/postgresql/data
          chmod 700 /var/lib/postgresql/data
        volumeMounts:
        - name: postgresql-data
          mountPath: /var/lib/postgresql/data
      containers:
      - name: postgresql
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: edusphere-config
              key: DB_NAME
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: DB_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: DB_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        - name: POSTGRES_INITDB_ARGS
          value: "--encoding=UTF8 --locale=en_US.UTF-8"
        volumeMounts:
        - name: postgresql-data
          mountPath: /var/lib/postgresql/data
        - name: postgresql-config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
        - name: init-scripts
          mountPath: /docker-entrypoint-initdb.d
        resources:
          requests:
            cpu: "4"
            memory: 16Gi
          limits:
            cpu: "8"
            memory: 32Gi
        livenessProbe:
          exec:
            command:
            - sh
            - -c
            - pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
            - sh
            - -c
            - pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
      volumes:
      - name: postgresql-config
        configMap:
          name: postgresql-config
      - name: init-scripts
        configMap:
          name: postgresql-init-scripts
  volumeClaimTemplates:
  - metadata:
      name: postgresql-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: database-storage
      resources:
        requests:
          storage: 500Gi
```

### PostgreSQL Configuration

```yaml
# postgresql-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-config
  namespace: edusphere-prod
data:
  postgresql.conf: |
    # Connection Settings
    listen_addresses = '*'
    port = 5432
    max_connections = 200
    superuser_reserved_connections = 3

    # Memory Settings
    shared_buffers = 8GB
    effective_cache_size = 24GB
    maintenance_work_mem = 2GB
    work_mem = 64MB

    # WAL Settings
    wal_level = replica
    max_wal_size = 4GB
    min_wal_size = 1GB
    checkpoint_completion_target = 0.9
    wal_buffers = 16MB

    # Replication Settings
    max_wal_senders = 10
    max_replication_slots = 10
    hot_standby = on

    # Query Tuning
    random_page_cost = 1.1
    effective_io_concurrency = 200
    default_statistics_target = 100

    # Logging
    logging_collector = on
    log_directory = 'pg_log'
    log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
    log_rotation_age = 1d
    log_rotation_size = 100MB
    log_min_duration_statement = 1000
    log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
    log_checkpoints = on
    log_connections = on
    log_disconnections = on
    log_lock_waits = on
    log_temp_files = 0

    # Performance
    shared_preload_libraries = 'pg_stat_statements,age,vector'

    # AGE Extension
    age.enable = on

    # Vector Extension
    vector.enable = on
```

### PostgreSQL Init Scripts

```yaml
# postgresql-init-scripts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-init-scripts
  namespace: edusphere-prod
data:
  01-extensions.sql: |
    -- Create extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "btree_gin";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";

    -- Create AGE extension for graph database
    CREATE EXTENSION IF NOT EXISTS age;
    LOAD 'age';
    SET search_path = ag_catalog, "$user", public;

    -- Create pgvector extension for embeddings
    CREATE EXTENSION IF NOT EXISTS vector;

    -- Create pg_stat_statements for query monitoring
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

  02-create-graph.sql: |
    -- Create graph for knowledge graph
    SELECT create_graph('edusphere_graph');

    -- Create vertex labels
    SELECT create_vlabel('edusphere_graph', 'User');
    SELECT create_vlabel('edusphere_graph', 'Course');
    SELECT create_vlabel('edusphere_graph', 'Module');
    SELECT create_vlabel('edusphere_graph', 'Lesson');
    SELECT create_vlabel('edusphere_graph', 'Assessment');
    SELECT create_vlabel('edusphere_graph', 'Skill');
    SELECT create_vlabel('edusphere_graph', 'LearningPath');

    -- Create edge labels
    SELECT create_elabel('edusphere_graph', 'ENROLLED_IN');
    SELECT create_elabel('edusphere_graph', 'COMPLETED');
    SELECT create_elabel('edusphere_graph', 'HAS_MODULE');
    SELECT create_elabel('edusphere_graph', 'HAS_LESSON');
    SELECT create_elabel('edusphere_graph', 'HAS_ASSESSMENT');
    SELECT create_elabel('edusphere_graph', 'REQUIRES_SKILL');
    SELECT create_elabel('edusphere_graph', 'FOLLOWS');
    SELECT create_elabel('edusphere_graph', 'PREREQUISITE');

  03-create-tables.sql: |
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) NOT NULL DEFAULT 'student',
      avatar_url TEXT,
      bio TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true,
      keycloak_id UUID UNIQUE
    );

    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_username ON users(username);
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_users_keycloak_id ON users(keycloak_id);

  04-create-indexes.sql: |
    -- Performance indexes
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
```

### Apply PostgreSQL Configuration

```bash
kubectl apply -f postgresql-config.yaml
kubectl apply -f postgresql-init-scripts.yaml
kubectl apply -f postgresql-statefulset.yaml

# Wait for StatefulSet to be ready
kubectl rollout status statefulset/postgresql -n edusphere-prod

# Verify PostgreSQL is running
kubectl exec -it postgresql-0 -n edusphere-prod -- psql -U edusphere_user -d edusphere -c "SELECT version();"
```

---

## 5. Keycloak Deployment

### Keycloak StatefulSet (HA Mode)

```yaml
# keycloak-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: keycloak
  namespace: edusphere-prod
  labels:
    app: keycloak
spec:
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: https
    port: 8443
    targetPort: 8443
  selector:
    app: keycloak
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: keycloak-headless
  namespace: edusphere-prod
  labels:
    app: keycloak
spec:
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: jgroups
    port: 7600
    targetPort: 7600
  clusterIP: None
  selector:
    app: keycloak
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: keycloak
  namespace: edusphere-prod
spec:
  serviceName: keycloak-headless
  replicas: 3
  selector:
    matchLabels:
      app: keycloak
  template:
    metadata:
      labels:
        app: keycloak
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - keycloak
              topologyKey: kubernetes.io/hostname
      containers:
      - name: keycloak
        image: quay.io/keycloak/keycloak:23.0
        args:
        - start
        - --auto-build
        - --db=postgres
        - --hostname-strict=false
        - --hostname-strict-https=false
        - --proxy=edge
        - --http-enabled=true
        - --cache-stack=kubernetes
        env:
        - name: KEYCLOAK_ADMIN
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: KEYCLOAK_ADMIN_USER
        - name: KEYCLOAK_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: KEYCLOAK_ADMIN_PASSWORD
        - name: KC_DB
          value: postgres
        - name: KC_DB_URL
          value: jdbc:postgresql://postgresql.edusphere-prod.svc.cluster.local:5432/keycloak
        - name: KC_DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: DB_USER
        - name: KC_DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: DB_PASSWORD
        - name: KC_CACHE
          value: ispn
        - name: KC_CACHE_STACK
          value: kubernetes
        - name: jgroups.dns.query
          value: keycloak-headless.edusphere-prod.svc.cluster.local
        - name: JAVA_OPTS_APPEND
          value: >-
            -Djgroups.dns.query=keycloak-headless.edusphere-prod.svc.cluster.local
            -Xms1024m -Xmx2048m
        ports:
        - name: http
          containerPort: 8080
        - name: https
          containerPort: 8443
        - name: jgroups
          containerPort: 7600
        resources:
          requests:
            cpu: "1"
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 90
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 5
```

### Keycloak Realm Configuration

```yaml
# keycloak-realm-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: keycloak-realm-config
  namespace: edusphere-prod
data:
  edusphere-realm.json: |
    {
      "realm": "edusphere",
      "enabled": true,
      "displayName": "EduSphere",
      "accessTokenLifespan": 300,
      "ssoSessionIdleTimeout": 1800,
      "ssoSessionMaxLifespan": 36000,
      "registrationAllowed": true,
      "registrationEmailAsUsername": true,
      "rememberMe": true,
      "verifyEmail": true,
      "loginWithEmailAllowed": true,
      "duplicateEmailsAllowed": false,
      "resetPasswordAllowed": true,
      "editUsernameAllowed": false,
      "bruteForceProtected": true,
      "permanentLockout": false,
      "maxFailureWaitSeconds": 900,
      "minimumQuickLoginWaitSeconds": 60,
      "waitIncrementSeconds": 60,
      "quickLoginCheckMilliSeconds": 1000,
      "maxDeltaTimeSeconds": 43200,
      "failureFactor": 5,
      "roles": {
        "realm": [
          {
            "name": "student",
            "description": "Student role"
          },
          {
            "name": "instructor",
            "description": "Instructor role"
          },
          {
            "name": "admin",
            "description": "Administrator role"
          }
        ]
      },
      "clients": [
        {
          "clientId": "edusphere-gateway",
          "enabled": true,
          "clientAuthenticatorType": "client-secret",
          "secret": "${KEYCLOAK_CLIENT_SECRET}",
          "redirectUris": ["*"],
          "webOrigins": ["*"],
          "protocol": "openid-connect",
          "publicClient": false,
          "directAccessGrantsEnabled": true,
          "serviceAccountsEnabled": true,
          "standardFlowEnabled": true,
          "implicitFlowEnabled": false
        },
        {
          "clientId": "edusphere-frontend",
          "enabled": true,
          "publicClient": true,
          "redirectUris": ["https://edusphere.example.com/*"],
          "webOrigins": ["https://edusphere.example.com"],
          "protocol": "openid-connect",
          "standardFlowEnabled": true,
          "implicitFlowEnabled": false,
          "directAccessGrantsEnabled": false
        }
      ]
    }
```

### Apply Keycloak

```bash
kubectl apply -f keycloak-statefulset.yaml
kubectl apply -f keycloak-realm-configmap.yaml

# Wait for Keycloak to be ready
kubectl rollout status statefulset/keycloak -n edusphere-prod

# Import realm (run once)
kubectl exec -it keycloak-0 -n edusphere-prod -- \
  /opt/keycloak/bin/kc.sh import \
  --file /path/to/edusphere-realm.json
```

---

## 6. NATS Cluster

### NATS StatefulSet with JetStream

```yaml
# nats-statefulset.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nats-config
  namespace: edusphere-prod
data:
  nats.conf: |
    port: 4222
    http_port: 8222

    # Cluster Configuration
    cluster {
      name: edusphere-cluster
      port: 6222

      routes = [
        nats://nats-0.nats-headless.edusphere-prod.svc.cluster.local:6222
        nats://nats-1.nats-headless.edusphere-prod.svc.cluster.local:6222
        nats://nats-2.nats-headless.edusphere-prod.svc.cluster.local:6222
      ]

      cluster_advertise: $CLUSTER_ADVERTISE
      connect_retries: 30
    }

    # JetStream Configuration
    jetstream {
      store_dir: /data/jetstream
      max_memory_store: 4GB
      max_file_store: 100GB
    }

    # Logging
    logtime: true
    log_file: "/data/nats.log"
    log_size_limit: 100MB
    max_traced_msg_len: 1024

    # Monitoring
    server_name: $POD_NAME

    # Limits
    max_payload: 8MB
    max_connections: 64K
    max_control_line: 4KB
    max_pending_size: 512MB

    # Performance
    write_deadline: "10s"
---
apiVersion: v1
kind: Service
metadata:
  name: nats
  namespace: edusphere-prod
  labels:
    app: nats
spec:
  selector:
    app: nats
  ports:
  - name: client
    port: 4222
    targetPort: 4222
  - name: monitoring
    port: 8222
    targetPort: 8222
  - name: cluster
    port: 6222
    targetPort: 6222
---
apiVersion: v1
kind: Service
metadata:
  name: nats-headless
  namespace: edusphere-prod
  labels:
    app: nats
spec:
  selector:
    app: nats
  clusterIP: None
  ports:
  - name: client
    port: 4222
    targetPort: 4222
  - name: cluster
    port: 6222
    targetPort: 6222
  - name: monitoring
    port: 8222
    targetPort: 8222
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: edusphere-prod
spec:
  serviceName: nats-headless
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - nats
            topologyKey: kubernetes.io/hostname
      containers:
      - name: nats
        image: nats:2.10-alpine
        ports:
        - containerPort: 4222
          name: client
        - containerPort: 6222
          name: cluster
        - containerPort: 8222
          name: monitoring
        command:
        - nats-server
        - --config
        - /etc/nats-config/nats.conf
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: CLUSTER_ADVERTISE
          value: $(POD_NAME).nats-headless.$(POD_NAMESPACE).svc.cluster.local
        volumeMounts:
        - name: config
          mountPath: /etc/nats-config
        - name: data
          mountPath: /data
        resources:
          requests:
            cpu: "1"
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 8Gi
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8222
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8222
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
      volumes:
      - name: config
        configMap:
          name: nats-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

### NATS Monitoring Service

```yaml
# nats-monitoring.yaml
apiVersion: v1
kind: Service
metadata:
  name: nats-monitoring
  namespace: edusphere-prod
  labels:
    app: nats
spec:
  selector:
    app: nats
  ports:
  - name: monitoring
    port: 8222
    targetPort: 8222
  type: ClusterIP
```

### Apply NATS

```bash
kubectl apply -f nats-statefulset.yaml
kubectl apply -f nats-monitoring.yaml

# Wait for NATS to be ready
kubectl rollout status statefulset/nats -n edusphere-prod

# Verify NATS cluster
kubectl exec -it nats-0 -n edusphere-prod -- nats-server --version
```

---

## 7. MinIO Deployment

### MinIO StatefulSet

```yaml
# minio-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: edusphere-storage
  labels:
    app: minio
spec:
  ports:
  - name: api
    port: 9000
    targetPort: 9000
  - name: console
    port: 9001
    targetPort: 9001
  selector:
    app: minio
---
apiVersion: v1
kind: Service
metadata:
  name: minio-headless
  namespace: edusphere-storage
  labels:
    app: minio
spec:
  clusterIP: None
  ports:
  - name: api
    port: 9000
    targetPort: 9000
  selector:
    app: minio
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: minio
  namespace: edusphere-storage
spec:
  serviceName: minio-headless
  replicas: 4
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      nodeSelector:
        workload: storage
      tolerations:
      - key: workload
        operator: Equal
        value: storage
        effect: NoSchedule
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - minio
            topologyKey: kubernetes.io/hostname
      containers:
      - name: minio
        image: minio/minio:RELEASE.2024-01-01T00-00-00Z
        args:
        - server
        - --console-address
        - :9001
        - http://minio-{0...3}.minio-headless.edusphere-storage.svc.cluster.local/data
        env:
        - name: MINIO_ROOT_USER
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: MINIO_ACCESS_KEY
        - name: MINIO_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: MINIO_SECRET_KEY
        - name: MINIO_PROMETHEUS_AUTH_TYPE
          value: "public"
        - name: MINIO_UPDATE
          value: "off"
        ports:
        - containerPort: 9000
          name: api
        - containerPort: 9001
          name: console
        volumeMounts:
        - name: data
          mountPath: /data
        resources:
          requests:
            cpu: "1"
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
        livenessProbe:
          httpGet:
            path: /minio/health/live
            port: 9000
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /minio/health/ready
            port: 9000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: object-storage
      resources:
        requests:
          storage: 500Gi
```

### MinIO Initialization Job

```yaml
# minio-init-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: minio-setup
  namespace: edusphere-storage
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: mc
        image: minio/mc:latest
        command:
        - /bin/sh
        - -c
        - |
          # Wait for MinIO to be ready
          until mc alias set myminio http://minio.edusphere-storage.svc.cluster.local:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD; do
            echo "Waiting for MinIO..."
            sleep 5
          done

          # Create buckets
          mc mb myminio/edusphere-uploads --ignore-existing
          mc mb myminio/edusphere-avatars --ignore-existing
          mc mb myminio/edusphere-course-content --ignore-existing
          mc mb myminio/edusphere-backups --ignore-existing

          # Set bucket policies
          mc anonymous set download myminio/edusphere-avatars
          mc anonymous set private myminio/edusphere-uploads
          mc anonymous set private myminio/edusphere-course-content
          mc anonymous set private myminio/edusphere-backups

          # Enable versioning
          mc version enable myminio/edusphere-uploads
          mc version enable myminio/edusphere-course-content

          # Set lifecycle policies
          cat <<EOF | mc ilm import myminio/edusphere-backups
          {
            "Rules": [
              {
                "ID": "expire-old-backups",
                "Status": "Enabled",
                "Expiration": {
                  "Days": 30
                }
              }
            ]
          }
          EOF

          echo "MinIO setup completed"
        env:
        - name: MINIO_ROOT_USER
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: MINIO_ACCESS_KEY
        - name: MINIO_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: MINIO_SECRET_KEY
```

### Apply MinIO

```bash
kubectl apply -f minio-statefulset.yaml
kubectl rollout status statefulset/minio -n edusphere-storage

# Run initialization
kubectl apply -f minio-init-job.yaml
kubectl logs -f job/minio-setup -n edusphere-storage
```

---

## 8. Jaeger

### Jaeger All-in-One Deployment

```yaml
# jaeger-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: jaeger-agent
  namespace: edusphere-monitoring
  labels:
    app: jaeger
    component: agent
spec:
  ports:
  - name: agent-zipkin-thrift
    port: 5775
    protocol: UDP
    targetPort: 5775
  - name: agent-compact
    port: 6831
    protocol: UDP
    targetPort: 6831
  - name: agent-binary
    port: 6832
    protocol: UDP
    targetPort: 6832
  - name: agent-configs
    port: 5778
    protocol: TCP
    targetPort: 5778
  selector:
    app: jaeger
    component: all-in-one
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: edusphere-monitoring
  labels:
    app: jaeger
    component: collector
spec:
  ports:
  - name: jaeger-collector-tchannel
    port: 14267
    protocol: TCP
    targetPort: 14267
  - name: jaeger-collector-http
    port: 14268
    protocol: TCP
    targetPort: 14268
  - name: jaeger-collector-grpc
    port: 14250
    protocol: TCP
    targetPort: 14250
  selector:
    app: jaeger
    component: all-in-one
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-query
  namespace: edusphere-monitoring
  labels:
    app: jaeger
    component: query
spec:
  ports:
  - name: query-http
    port: 16686
    protocol: TCP
    targetPort: 16686
  selector:
    app: jaeger
    component: all-in-one
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: edusphere-monitoring
  labels:
    app: jaeger
    component: all-in-one
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
      component: all-in-one
  template:
    metadata:
      labels:
        app: jaeger
        component: all-in-one
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:1.53
        env:
        - name: COLLECTOR_ZIPKIN_HOST_PORT
          value: :9411
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
        - name: SPAN_STORAGE_TYPE
          value: badger
        - name: BADGER_EPHEMERAL
          value: "false"
        - name: BADGER_DIRECTORY_VALUE
          value: /badger/data
        - name: BADGER_DIRECTORY_KEY
          value: /badger/key
        ports:
        - containerPort: 5775
          protocol: UDP
        - containerPort: 6831
          protocol: UDP
        - containerPort: 6832
          protocol: UDP
        - containerPort: 5778
          protocol: TCP
        - containerPort: 16686
          protocol: TCP
        - containerPort: 14268
          protocol: TCP
        - containerPort: 14250
          protocol: TCP
        - containerPort: 9411
          protocol: TCP
        volumeMounts:
        - name: badger-data
          mountPath: /badger
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: "1"
            memory: 2Gi
        readinessProbe:
          httpGet:
            path: /
            port: 16686
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 16686
          initialDelaySeconds: 30
          periodSeconds: 30
      volumes:
      - name: badger-data
        persistentVolumeClaim:
          claimName: jaeger-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: jaeger-pvc
  namespace: edusphere-monitoring
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
```

### Apply Jaeger

```bash
kubectl apply -f jaeger-deployment.yaml
kubectl rollout status deployment/jaeger -n edusphere-monitoring
```

---

## 9. Gateway Deployment

### Gateway Deployment with HPA

```yaml
# gateway-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: gateway
  namespace: edusphere-prod
  labels:
    app: gateway
spec:
  ports:
  - port: 4000
    targetPort: 4000
    name: http
  selector:
    app: gateway
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
  namespace: edusphere-prod
  labels:
    app: gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "4000"
        prometheus.io/path: "/metrics"
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - gateway
              topologyKey: kubernetes.io/hostname
      containers:
      - name: gateway
        image: edusphere/gateway:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 4000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "4000"
        envFrom:
        - configMapRef:
            name: edusphere-config
        - secretRef:
            name: edusphere-secrets
        resources:
          requests:
            cpu: "1"
            memory: 1Gi
          limits:
            cpu: "2"
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 15
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gateway-hpa
  namespace: edusphere-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: gateway-pdb
  namespace: edusphere-prod
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: gateway
```

### Apply Gateway

```bash
kubectl apply -f gateway-deployment.yaml
kubectl rollout status deployment/gateway -n edusphere-prod
```

---

## 10. Subgraph Deployments

### User Service

```yaml
# user-service-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: edusphere-prod
  labels:
    app: user-service
spec:
  ports:
  - port: 4001
    targetPort: 4001
    name: http
  selector:
    app: user-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: edusphere-prod
  labels:
    app: user-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "4001"
    spec:
      containers:
      - name: user-service
        image: edusphere/user-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 4001
        env:
        - name: PORT
          value: "4001"
        - name: SERVICE_NAME
          value: "user-service"
        envFrom:
        - configMapRef:
            name: edusphere-config
        - secretRef:
            name: edusphere-secrets
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: "1"
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 4001
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 4001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: edusphere-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: user-service-pdb
  namespace: edusphere-prod
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: user-service
```

### Course Service

```yaml
# course-service-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: course-service
  namespace: edusphere-prod
  labels:
    app: course-service
spec:
  ports:
  - port: 4002
    targetPort: 4002
    name: http
  selector:
    app: course-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: course-service
  namespace: edusphere-prod
  labels:
    app: course-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: course-service
  template:
    metadata:
      labels:
        app: course-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "4002"
    spec:
      containers:
      - name: course-service
        image: edusphere/course-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 4002
        env:
        - name: PORT
          value: "4002"
        - name: SERVICE_NAME
          value: "course-service"
        envFrom:
        - configMapRef:
            name: edusphere-config
        - secretRef:
            name: edusphere-secrets
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: "1"
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 4002
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 4002
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: course-service-hpa
  namespace: edusphere-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: course-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: course-service-pdb
  namespace: edusphere-prod
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: course-service
```

### Enrollment, Content, Assessment, and Notification Services

```yaml
# enrollment-service-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: enrollment-service
  namespace: edusphere-prod
spec:
  ports:
  - port: 4003
    targetPort: 4003
  selector:
    app: enrollment-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enrollment-service
  namespace: edusphere-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: enrollment-service
  template:
    metadata:
      labels:
        app: enrollment-service
    spec:
      containers:
      - name: enrollment-service
        image: edusphere/enrollment-service:latest
        ports:
        - containerPort: 4003
        env:
        - name: PORT
          value: "4003"
        envFrom:
        - configMapRef:
            name: edusphere-config
        - secretRef:
            name: edusphere-secrets
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: "1"
            memory: 1Gi
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: enrollment-service-hpa
  namespace: edusphere-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: enrollment-service
  minReplicas: 2
  maxReplicas: 6
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
# Similar for content, assessment, notification services
# content-service: port 4004
# assessment-service: port 4005
# notification-service: port 4006
```

---

## 11. Frontend Deployment

```yaml
# frontend-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: edusphere-prod
  labels:
    app: frontend
spec:
  ports:
  - port: 80
    targetPort: 80
    name: http
  selector:
    app: frontend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: edusphere-prod
  labels:
    app: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: edusphere/frontend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 80
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.edusphere.example.com"
        - name: NEXT_PUBLIC_GRAPHQL_URL
          value: "https://api.edusphere.example.com/graphql"
        - name: NEXT_PUBLIC_KEYCLOAK_URL
          valueFrom:
            configMapKeyRef:
              name: edusphere-config
              key: KEYCLOAK_URL
        - name: NEXT_PUBLIC_KEYCLOAK_REALM
          value: "edusphere"
        - name: NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
          value: "edusphere-frontend"
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: edusphere-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: frontend-pdb
  namespace: edusphere-prod
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: frontend
```

---

## 12. Traefik Ingress

### Install Traefik via Helm

```bash
# Add Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Install Traefik
helm install traefik traefik/traefik \
  --namespace edusphere-ingress \
  --set deployment.replicas=3 \
  --set resources.requests.cpu=1 \
  --set resources.requests.memory=1Gi \
  --set resources.limits.cpu=2 \
  --set resources.limits.memory=2Gi \
  --set ports.web.redirectTo.port=websecure \
  --set ports.websecure.tls.enabled=true \
  --set ingressRoute.dashboard.enabled=true \
  --set metrics.prometheus.enabled=true
```

### Traefik Middleware (Rate Limiting)

```yaml
# traefik-middleware.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: edusphere-ingress
spec:
  rateLimit:
    average: 100
    burst: 200
    period: 1s
---
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: security-headers
  namespace: edusphere-ingress
spec:
  headers:
    customResponseHeaders:
      X-Frame-Options: "SAMEORIGIN"
      X-Content-Type-Options: "nosniff"
      X-XSS-Protection: "1; mode=block"
      Strict-Transport-Security: "max-age=31536000; includeSubDomains"
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
---
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: compression
  namespace: edusphere-ingress
spec:
  compress:
    excludedContentTypes:
    - text/event-stream
```

### Traefik IngressRoute

```yaml
# traefik-ingressroute.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: edusphere-web
  namespace: edusphere-prod
spec:
  entryPoints:
  - websecure
  routes:
  - match: Host(`edusphere.example.com`)
    kind: Rule
    services:
    - name: frontend
      port: 80
    middlewares:
    - name: rate-limit
      namespace: edusphere-ingress
    - name: security-headers
      namespace: edusphere-ingress
    - name: compression
      namespace: edusphere-ingress
  tls:
    secretName: edusphere-tls
---
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: edusphere-api
  namespace: edusphere-prod
spec:
  entryPoints:
  - websecure
  routes:
  - match: Host(`api.edusphere.example.com`)
    kind: Rule
    services:
    - name: gateway
      port: 4000
    middlewares:
    - name: rate-limit
      namespace: edusphere-ingress
    - name: security-headers
      namespace: edusphere-ingress
    - name: compression
      namespace: edusphere-ingress
  tls:
    secretName: edusphere-tls
```

### Apply Traefik Configuration

```bash
kubectl apply -f traefik-middleware.yaml
kubectl apply -f traefik-ingressroute.yaml
```

---

## 13. HPA & PDB Configuration

### Metrics Server

```bash
# Install metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Verify HPA

```bash
# Check all HPAs
kubectl get hpa -n edusphere-prod

# Watch HPA status
kubectl get hpa -n edusphere-prod --watch
```

### PDB Summary

All critical services have PodDisruptionBudgets defined:
- Gateway: minAvailable: 2
- User Service: minAvailable: 1
- Course Service: minAvailable: 1
- Frontend: minAvailable: 2
- PostgreSQL: maxUnavailable: 1
- NATS: maxUnavailable: 1
- Keycloak: maxUnavailable: 1

---

## 14. Network Policies

```yaml
# network-policies.yaml
# Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: edusphere-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
# Allow ingress to gateway from Traefik
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway-ingress
  namespace: edusphere-prod
spec:
  podSelector:
    matchLabels:
      app: gateway
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: edusphere-ingress
    ports:
    - protocol: TCP
      port: 4000
---
# Allow gateway to services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway-to-services
  namespace: edusphere-prod
spec:
  podSelector:
    matchLabels:
      app: user-service
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: gateway
    ports:
    - protocol: TCP
      port: 4001
---
# Allow services to PostgreSQL
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-services-to-postgres
  namespace: edusphere-prod
spec:
  podSelector:
    matchLabels:
      app: postgresql
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 5432
---
# Allow services to NATS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-services-to-nats
  namespace: edusphere-prod
spec:
  podSelector:
    matchLabels:
      app: nats
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 4222
---
# Allow frontend ingress from Traefik
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-ingress
  namespace: edusphere-prod
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: edusphere-ingress
    ports:
    - protocol: TCP
      port: 80
---
# Allow Prometheus scraping
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scraping
  namespace: edusphere-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: edusphere-monitoring
      podSelector:
        matchLabels:
          app: prometheus
    ports:
    - protocol: TCP
      port: 4000
```

### Apply Network Policies

```bash
kubectl apply -f network-policies.yaml
```

---

## 15. Monitoring

### Prometheus via Helm

```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace edusphere-monitoring \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=fast-ssd \
  --set grafana.enabled=true \
  --set grafana.adminPassword=changeme \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.size=20Gi
```

### ServiceMonitor for Services

```yaml
# service-monitors.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: edusphere-services
  namespace: edusphere-monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      tier: backend
  namespaceSelector:
    matchNames:
    - edusphere-prod
  endpoints:
  - port: http
    interval: 30s
    path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: gateway
  namespace: edusphere-monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: gateway
  namespaceSelector:
    matchNames:
    - edusphere-prod
  endpoints:
  - port: http
    interval: 15s
    path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgresql
  namespace: edusphere-monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: postgresql
  namespaceSelector:
    matchNames:
    - edusphere-prod
  endpoints:
  - port: postgres
    interval: 30s
```

### Grafana Dashboards

```yaml
# grafana-dashboard-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edusphere-dashboard
  namespace: edusphere-monitoring
  labels:
    grafana_dashboard: "1"
data:
  edusphere-overview.json: |
    {
      "dashboard": {
        "title": "EduSphere Overview",
        "panels": [
          {
            "title": "Request Rate",
            "targets": [
              {
                "expr": "sum(rate(http_requests_total[5m])) by (service)"
              }
            ]
          },
          {
            "title": "Error Rate",
            "targets": [
              {
                "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
              }
            ]
          },
          {
            "title": "Response Time (p95)",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))"
              }
            ]
          }
        ]
      }
    }
```

### Apply Monitoring

```bash
kubectl apply -f service-monitors.yaml
kubectl apply -f grafana-dashboard-configmap.yaml

# Access Grafana
kubectl port-forward -n edusphere-monitoring svc/prometheus-grafana 3000:80
```

---

## 16. Helm Charts

### Create Helm Chart Structure

```bash
# Create chart directory
mkdir -p edusphere-chart
cd edusphere-chart

# Create Chart.yaml
cat > Chart.yaml <<EOF
apiVersion: v2
name: edusphere
description: EduSphere Learning Management System
type: application
version: 1.0.0
appVersion: "1.0.0"
dependencies:
- name: postgresql
  version: 13.x.x
  repository: https://charts.bitnami.com/bitnami
  condition: postgresql.enabled
- name: traefik
  version: 20.x.x
  repository: https://traefik.github.io/charts
  condition: traefik.enabled
- name: kube-prometheus-stack
  version: 45.x.x
  repository: https://prometheus-community.github.io/helm-charts
  condition: prometheus.enabled
EOF

# Create values.yaml
cat > values.yaml <<EOF
global:
  storageClass: fast-ssd
  environment: production

gateway:
  replicas: 3
  image:
    repository: edusphere/gateway
    tag: latest
  resources:
    requests:
      cpu: 1
      memory: 1Gi
    limits:
      cpu: 2
      memory: 2Gi
  hpa:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

services:
  user:
    replicas: 2
    port: 4001
  course:
    replicas: 2
    port: 4002
  enrollment:
    replicas: 2
    port: 4003
  content:
    replicas: 2
    port: 4004
  assessment:
    replicas: 2
    port: 4005
  notification:
    replicas: 2
    port: 4006

postgresql:
  enabled: true
  architecture: replication
  primary:
    persistence:
      size: 500Gi
  readReplicas:
    replicaCount: 2

nats:
  enabled: true
  cluster:
    enabled: true
    replicas: 3
  jetstream:
    enabled: true
    memStorage:
      size: 4Gi
    fileStorage:
      size: 100Gi

minio:
  enabled: true
  mode: distributed
  replicas: 4
  persistence:
    size: 500Gi

keycloak:
  enabled: true
  replicas: 3
  ha:
    enabled: true

traefik:
  enabled: true
  deployment:
    replicas: 3

prometheus:
  enabled: true
  prometheus:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 100Gi

frontend:
  replicas: 3
  image:
    repository: edusphere/frontend
    tag: latest
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
EOF
```

### Install with Helm

```bash
# Install EduSphere chart
helm install edusphere ./edusphere-chart \
  --namespace edusphere-prod \
  --create-namespace \
  --values values.yaml

# Upgrade
helm upgrade edusphere ./edusphere-chart \
  --namespace edusphere-prod \
  --values values.yaml

# Rollback
helm rollback edusphere 1 --namespace edusphere-prod
```

---

## 17. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubernetes

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: edusphere

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - gateway
          - user-service
          - course-service
          - enrollment-service
          - content-service
          - assessment-service
          - notification-service
          - frontend

    steps:
    - uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha,prefix={{branch}}-

    - name: Build and push
      uses: docker/build-push-action@v5
      with:
        context: ./${{ matrix.service }}
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v4

    - name: Set up kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'

    - name: Configure kubectl
      run: |
        mkdir -p $HOME/.kube
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config

    - name: Deploy with Helm
      run: |
        helm upgrade --install edusphere ./edusphere-chart \
          --namespace edusphere-prod \
          --set gateway.image.tag=${{ github.sha }} \
          --set services.user.image.tag=${{ github.sha }} \
          --set services.course.image.tag=${{ github.sha }} \
          --set services.enrollment.image.tag=${{ github.sha }} \
          --set services.content.image.tag=${{ github.sha }} \
          --set services.assessment.image.tag=${{ github.sha }} \
          --set services.notification.image.tag=${{ github.sha }} \
          --set frontend.image.tag=${{ github.sha }} \
          --wait \
          --timeout 10m

    - name: Verify deployment
      run: |
        kubectl rollout status deployment/gateway -n edusphere-prod
        kubectl rollout status deployment/frontend -n edusphere-prod
        kubectl get pods -n edusphere-prod
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_REGISTRY: registry.gitlab.com
  KUBERNETES_VERSION: 1.28.0

.build_template: &build_definition
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE/$SERVICE_NAME:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE/$SERVICE_NAME:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE/$SERVICE_NAME:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE/$SERVICE_NAME:latest
    - docker push $CI_REGISTRY_IMAGE/$SERVICE_NAME:latest

build:gateway:
  <<: *build_definition
  variables:
    SERVICE_NAME: gateway

build:user-service:
  <<: *build_definition
  variables:
    SERVICE_NAME: user-service

# ... other services

deploy:production:
  stage: deploy
  image: alpine/helm:3.12.0
  only:
    - main
  before_script:
    - kubectl config set-cluster k8s --server="$KUBE_URL" --insecure-skip-tls-verify=true
    - kubectl config set-credentials admin --token="$KUBE_TOKEN"
    - kubectl config set-context default --cluster=k8s --user=admin
    - kubectl config use-context default
  script:
    - helm upgrade --install edusphere ./edusphere-chart
        --namespace edusphere-prod
        --set gateway.image.tag=$CI_COMMIT_SHA
        --wait
        --timeout 10m
  environment:
    name: production
    url: https://edusphere.example.com
```

---

## 18. Zero-Downtime Updates

### Rolling Update Strategy

```yaml
# deployment-strategy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
  namespace: edusphere-prod
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Max 2 extra pods during update
      maxUnavailable: 1  # Max 1 pod unavailable during update
  minReadySeconds: 30   # Wait 30s before considering pod ready
  progressDeadlineSeconds: 600
  template:
    spec:
      containers:
      - name: gateway
        image: edusphere/gateway:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

### Blue-Green Deployment

```bash
# 1. Deploy new version (green)
kubectl apply -f gateway-green-deployment.yaml

# 2. Wait for green to be healthy
kubectl rollout status deployment/gateway-green -n edusphere-prod

# 3. Switch service to green
kubectl patch service gateway -n edusphere-prod \
  -p '{"spec":{"selector":{"version":"green"}}}'

# 4. Verify traffic
kubectl get endpoints gateway -n edusphere-prod

# 5. Delete old blue deployment
kubectl delete deployment gateway-blue -n edusphere-prod
```

### Canary Deployment with Flagger

```yaml
# canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: gateway
  namespace: edusphere-prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gateway
  progressDeadlineSeconds: 60
  service:
    port: 4000
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    webhooks:
    - name: load-test
      url: http://flagger-loadtester/
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://gateway-canary.edusphere-prod:4000"
```

### Database Migrations

```yaml
# db-migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-v1-2-0
  namespace: edusphere-prod
spec:
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: edusphere/db-migrator:1.2.0
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: edusphere-config
              key: DB_HOST
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: edusphere-config
              key: DB_NAME
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: DB_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: edusphere-secrets
              key: DB_PASSWORD
        command:
        - npm
        - run
        - migrate:up
```

---

## 19. Disaster Recovery

### Backup Strategy

#### PostgreSQL Backup CronJob

```yaml
# postgresql-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
  namespace: edusphere-prod
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: postgres:16-alpine
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="/backups/edusphere_backup_${TIMESTAMP}.sql.gz"

              pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE

              # Upload to MinIO
              mc alias set minio http://minio.edusphere-storage.svc.cluster.local:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
              mc cp $BACKUP_FILE minio/edusphere-backups/postgresql/

              # Keep only last 30 days
              find /backups -name "*.sql.gz" -mtime +30 -delete

              echo "Backup completed: $BACKUP_FILE"
            env:
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: edusphere-config
                  key: DB_HOST
            - name: DB_NAME
              valueFrom:
                configMapKeyRef:
                  name: edusphere-config
                  key: DB_NAME
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: edusphere-secrets
                  key: DB_USER
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: edusphere-secrets
                  key: DB_PASSWORD
            - name: MINIO_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: edusphere-secrets
                  key: MINIO_ACCESS_KEY
            - name: MINIO_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: edusphere-secrets
                  key: MINIO_SECRET_KEY
            volumeMounts:
            - name: backups
              mountPath: /backups
          volumes:
          - name: backups
            persistentVolumeClaim:
              claimName: backup-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-pvc
  namespace: edusphere-prod
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 200Gi
```

#### Velero for Cluster Backup

```bash
# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket edusphere-velero-backups \
  --secret-file ./credentials-velero \
  --use-volume-snapshots=true \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1

# Create backup schedule
velero schedule create edusphere-daily \
  --schedule="0 3 * * *" \
  --include-namespaces edusphere-prod \
  --ttl 720h0m0s

# Manual backup
velero backup create edusphere-manual \
  --include-namespaces edusphere-prod \
  --wait
```

### Restore Procedures

#### PostgreSQL Restore

```bash
# 1. Scale down applications
kubectl scale deployment --all --replicas=0 -n edusphere-prod

# 2. Restore database
kubectl exec -it postgresql-0 -n edusphere-prod -- bash
psql -U edusphere_user -d postgres -c "DROP DATABASE edusphere;"
psql -U edusphere_user -d postgres -c "CREATE DATABASE edusphere;"
gunzip -c /backups/edusphere_backup_20240101_020000.sql.gz | psql -U edusphere_user -d edusphere

# 3. Scale up applications
kubectl scale deployment --all --replicas=1 -n edusphere-prod
```

#### Velero Restore

```bash
# List backups
velero backup get

# Restore from backup
velero restore create --from-backup edusphere-daily-20240101020000

# Monitor restore
velero restore describe <restore-name>
velero restore logs <restore-name>
```

### High Availability Setup

```yaml
# postgresql-ha.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgresql-ha
  namespace: edusphere-prod
spec:
  instances: 3
  primaryUpdateStrategy: unsupervised

  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "8GB"
      effective_cache_size: "24GB"

  bootstrap:
    initdb:
      database: edusphere
      owner: edusphere_user

  storage:
    size: 500Gi
    storageClass: database-storage

  monitoring:
    enablePodMonitor: true

  backup:
    barmanObjectStore:
      destinationPath: s3://edusphere-backups/postgresql
      s3Credentials:
        accessKeyId:
          name: edusphere-secrets
          key: MINIO_ACCESS_KEY
        secretAccessKey:
          name: edusphere-secrets
          key: MINIO_SECRET_KEY
      wal:
        compression: gzip
        maxParallel: 8
    retentionPolicy: "30d"
```

---

## 20. Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl get pods -n edusphere-prod
kubectl describe pod <pod-name> -n edusphere-prod

# Check events
kubectl get events -n edusphere-prod --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n edusphere-prod
kubectl logs <pod-name> -n edusphere-prod --previous  # Previous container logs

# Check resource quotas
kubectl describe resourcequota -n edusphere-prod
```

#### 2. Service Connection Issues

```bash
# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup postgresql.edusphere-prod.svc.cluster.local

# Test service connectivity
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash
curl http://gateway.edusphere-prod.svc.cluster.local:4000/health

# Check endpoints
kubectl get endpoints -n edusphere-prod
```

#### 3. Database Connection Failures

```bash
# Check PostgreSQL logs
kubectl logs postgresql-0 -n edusphere-prod

# Connect to PostgreSQL
kubectl exec -it postgresql-0 -n edusphere-prod -- psql -U edusphere_user -d edusphere

# Check connections
SELECT count(*) FROM pg_stat_activity;
SELECT * FROM pg_stat_activity WHERE datname = 'edusphere';

# Check replication status
SELECT * FROM pg_stat_replication;
```

#### 4. Performance Issues

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n edusphere-prod

# Check HPA status
kubectl get hpa -n edusphere-prod
kubectl describe hpa gateway-hpa -n edusphere-prod

# Check for pod throttling
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/edusphere-prod/pods | jq .
```

#### 5. Storage Issues

```bash
# Check PVC status
kubectl get pvc -n edusphere-prod
kubectl describe pvc postgresql-data-postgresql-0 -n edusphere-prod

# Check PV status
kubectl get pv

# Check storage class
kubectl get sc
```

#### 6. Network Policy Issues

```bash
# List network policies
kubectl get networkpolicies -n edusphere-prod

# Describe specific policy
kubectl describe networkpolicy allow-gateway-ingress -n edusphere-prod

# Test connectivity with netshoot
kubectl run netshoot --rm -it --image=nicolaka/netshoot -n edusphere-prod -- bash
```

### Debugging Tools

#### Install debugging pod

```yaml
# debug-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-pod
  namespace: edusphere-prod
spec:
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ["sleep", "infinity"]
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
```

```bash
kubectl apply -f debug-pod.yaml
kubectl exec -it debug-pod -n edusphere-prod -- bash

# Inside debug pod
curl http://gateway:4000/health
nslookup postgresql
traceroute gateway
tcpdump -i any port 4000
```

### Monitoring Commands

```bash
# Watch all pods
watch kubectl get pods -n edusphere-prod

# Stream logs from multiple pods
kubectl logs -f -l app=gateway -n edusphere-prod --all-containers=true

# Get recent events
kubectl get events -n edusphere-prod --watch

# Check cluster info
kubectl cluster-info
kubectl get nodes -o wide
kubectl describe node <node-name>
```

### Emergency Procedures

#### Scale down all services

```bash
kubectl scale deployment --all --replicas=0 -n edusphere-prod
```

#### Emergency database backup

```bash
kubectl exec -it postgresql-0 -n edusphere-prod -- \
  pg_dump -U edusphere_user edusphere | gzip > emergency_backup.sql.gz
```

#### Restart all pods

```bash
kubectl rollout restart deployment -n edusphere-prod
```

### Health Check Endpoints

All services should implement:
- `/health` - Liveness probe
- `/ready` - Readiness probe
- `/metrics` - Prometheus metrics

```bash
# Test health endpoints
curl http://<service>:port/health
curl http://<service>:port/ready
curl http://<service>:port/metrics
```

---

## Additional Resources

### Documentation
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Tools
- kubectl
- helm
- k9s (Kubernetes CLI)
- stern (Multi-pod log tailing)
- kubectx/kubens (Context switching)
- velero (Backup/Restore)

### Support
For issues or questions:
- GitHub: https://github.com/edusphere/edusphere
- Documentation: https://docs.edusphere.example.com
- Email: support@edusphere.example.com

---

**Last Updated**: 2024-01-01
**Version**: 1.0.0
**Maintainer**: EduSphere DevOps Team
