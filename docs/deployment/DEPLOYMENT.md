# EduSphere - Deployment Guide

**Production Deployment to Kubernetes / Docker Swarm / Cloud Run**

---

## 🚀 Deployment Options

### Option 1: Docker Single Container (Simplest)
### Option 2: Docker Compose (Development/Staging)
### Option 3: Kubernetes (Production)
### Option 4: Google Cloud Run (Serverless)

---

## 📦 Option 1: Docker Single Container

**Best for:** Small deployments, demos, testing

### Build Image
```bash
# Build production image
docker build -t edusphere:latest .

# Tag for registry
docker tag edusphere:latest registry.example.com/edusphere:v1.0.0
```

### Push to Registry
```bash
# Docker Hub
docker push registry.example.com/edusphere:v1.0.0

# Google Container Registry
docker tag edusphere:latest gcr.io/project-id/edusphere:v1.0.0
docker push gcr.io/project-id/edusphere:v1.0.0

# AWS ECR
docker tag edusphere:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/edusphere:v1.0.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/edusphere:v1.0.0
```

### Run Container
```bash
docker run -d \
  --name edusphere \
  -p 4000-4006:4000-4006 \
  -p 5432:5432 \
  -p 6379:6379 \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:pass@localhost:5432/edusphere \
  --restart unless-stopped \
  edusphere:latest
```

---

## 🐳 Option 2: Docker Compose

**Best for:** Development, staging, multi-container setups

### Production docker-compose.yml
```yaml
version: '3.9'

services:
  gateway:
    image: edusphere:latest
    working_dir: /app/apps/gateway
    command: pnpm start
    environment:
      - NODE_ENV=production
      - PORT=4000
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis

  subgraph-core:
    image: edusphere:latest
    working_dir: /app/apps/subgraph-core
    command: pnpm start
    environment:
      - NODE_ENV=production
      - PORT=4001
      - DATABASE_URL=postgresql://user:pass@postgres:5432/edusphere
    ports:
      - "4001:4001"

  # ... (repeat for all 6 subgraphs)

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=edusphere
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=edusphere
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Deploy
```bash
# Set environment variables
export DB_PASSWORD=secure_password
export REDIS_PASSWORD=secure_password

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## ☸️ Option 3: Kubernetes

**Best for:** Production, high availability, auto-scaling

### Prerequisites
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Kubernetes Manifests

#### 1. Namespace
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: edusphere
```

#### 2. ConfigMap
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: edusphere-config
  namespace: edusphere
data:
  NODE_ENV: "production"
  PORT: "4000"
  LOG_LEVEL: "info"
```

#### 3. Secrets
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: edusphere-secrets
  namespace: edusphere
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/edusphere"
  REDIS_URL: "redis://:password@redis:6379"
  JWT_SECRET: "your-secret-key"
```

#### 4. PostgreSQL StatefulSet
```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: edusphere
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: edusphere
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
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: edusphere
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

#### 5. Gateway Deployment
```yaml
# k8s/gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
  namespace: edusphere
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
      - name: gateway
        image: gcr.io/project-id/edusphere:v1.0.0
        workingDir: /app/apps/gateway
        command: ["pnpm", "start"]
        ports:
        - containerPort: 4000
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
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: gateway
  namespace: edusphere
spec:
  type: LoadBalancer
  selector:
    app: gateway
  ports:
  - port: 80
    targetPort: 4000
```

#### 6. Subgraph Deployments (Example: Core)
```yaml
# k8s/subgraph-core-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: subgraph-core
  namespace: edusphere
spec:
  replicas: 2
  selector:
    matchLabels:
      app: subgraph-core
  template:
    metadata:
      labels:
        app: subgraph-core
    spec:
      containers:
      - name: subgraph-core
        image: gcr.io/project-id/edusphere:v1.0.0
        workingDir: /app/apps/subgraph-core
        command: ["pnpm", "start"]
        ports:
        - containerPort: 4001
        env:
        - name: PORT
          value: "4001"
        envFrom:
        - configMapRef:
            name: edusphere-config
        - secretRef:
            name: edusphere-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: subgraph-core
  namespace: edusphere
spec:
  selector:
    app: subgraph-core
  ports:
  - port: 4001
    targetPort: 4001
```

### Deploy to Kubernetes
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create ConfigMap and Secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deploy PostgreSQL
kubectl apply -f k8s/postgres.yaml

# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Deploy all subgraphs
kubectl apply -f k8s/subgraph-core-deployment.yaml
kubectl apply -f k8s/subgraph-content-deployment.yaml
kubectl apply -f k8s/subgraph-annotation-deployment.yaml
kubectl apply -f k8s/subgraph-collaboration-deployment.yaml
kubectl apply -f k8s/subgraph-agent-deployment.yaml
kubectl apply -f k8s/subgraph-knowledge-deployment.yaml

# Deploy Gateway
kubectl apply -f k8s/gateway-deployment.yaml

# Check status
kubectl get pods -n edusphere
kubectl get services -n edusphere

# View logs
kubectl logs -f deployment/gateway -n edusphere

# Scale deployment
kubectl scale deployment gateway --replicas=5 -n edusphere
```

---

## ☁️ Option 4: Google Cloud Run

**Best for:** Serverless, auto-scaling, pay-per-use

### Deploy to Cloud Run
```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/edusphere

# Deploy
gcloud run deploy edusphere \
  --image gcr.io/PROJECT_ID/edusphere \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 4000 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=DATABASE_URL:latest
```

---

## 🔒 Security Checklist

- [ ] Use secrets management (Kubernetes Secrets, AWS Secrets Manager, etc.)
- [ ] Enable HTTPS/TLS (Let's Encrypt, CloudFlare, etc.)
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up monitoring (Prometheus, Grafana, Datadog)
- [ ] Configure logging (ELK Stack, Loki, Cloud Logging)
- [ ] Enable CORS properly
- [ ] Rotate credentials regularly
- [ ] Use non-root containers
- [ ] Scan images for vulnerabilities

---

## 📊 Monitoring & Observability

### Prometheus + Grafana
```yaml
# k8s/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
      - job_name: 'gateway'
        static_configs:
          - targets: ['gateway:4000']
      - job_name: 'subgraphs'
        static_configs:
          - targets:
            - 'subgraph-core:4001'
            - 'subgraph-content:4002'
            # ... etc
```

### Health Checks
```bash
# Gateway health
curl https://your-domain.com/health

# Kubernetes readiness probe
curl http://gateway:4000/health
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t edusphere:${{ github.sha }} .

      - name: Push to GCR
        run: |
          docker tag edusphere:${{ github.sha }} gcr.io/$PROJECT_ID/edusphere:${{ github.sha }}
          docker push gcr.io/$PROJECT_ID/edusphere:${{ github.sha }}

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/gateway gateway=gcr.io/$PROJECT_ID/edusphere:${{ github.sha }}
```

---

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Helm Charts](https://helm.sh/docs/)
- [Google Cloud Run](https://cloud.google.com/run/docs)

---

**🎉 Deployment Complete!**

Your EduSphere platform is now running in production with:
- ✅ High availability
- ✅ Auto-scaling
- ✅ Monitoring & logging
- ✅ Security best practices
