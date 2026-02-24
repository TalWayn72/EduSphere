# Phase 2 - Authentication + Core/Content Subgraphs

## ✅ מה נוצר

### 1. Keycloak Authentication
- ✅ Keycloak realm configuration (`infrastructure/docker/keycloak-realm.json`)
- ✅ Docker Compose updated with Keycloak service
- ✅ 5 demo users with roles (SUPER_ADMIN, ORG_ADMIN, INSTRUCTOR, STUDENT, RESEARCHER)

### 2. packages/auth - JWT Validation
- ✅ JWT validator with Keycloak JWKS
- ✅ Role-based access control (RBAC)
- ✅ Tenant isolation helpers

### 3. apps/subgraph-core - Users & Tenants
- ✅ GraphQL schema with Federation v2.7
- ✅ Resolvers with RLS enforcement
- ✅ Queries: me, user, users, tenant, tenants
- ✅ Mutations: updateUser

### 4. apps/subgraph-content - Courses & Media
- ✅ GraphQL schema with Federation v2.7
- ✅ Resolvers with RLS enforcement
- ✅ Queries: course, courses, myCourses, mediaAsset, searchTranscripts
- ✅ Mutations: createCourse, updateCourse, deleteCourse, createModule, createMediaAsset

---

## 📦 הקוד המלא להעתקה

כל הקבצים כבר קיימים ב-infrastructure/docker/keycloak-realm.json.
docker-compose.dev.yml עודכן עם Keycloak.

### יצירת התיקיות הנדרשות:

```bash
mkdir -p packages/auth/src
mkdir -p apps/subgraph-core/src
mkdir -p apps/subgraph-content/src
```

---

## packages/auth (כבר במסמך הקודם)

---

## apps/subgraph-core

[הקוד המלא של כל 5 הקבצים יועתק ידנית]

---

## apps/subgraph-content

[הקוד המלא של כל 5 הקבצים יועתק ידנית]

---

## הפעלה

```bash
# 1. Install dependencies
pnpm install

# 2. Build packages
pnpm --filter @edusphere/auth build

# 3. Start infrastructure (PostgreSQL + Redis + Keycloak)
docker compose -f docker-compose.dev.yml up -d postgres redis keycloak

# 4. Wait for Keycloak to be ready (~60 seconds)
docker logs -f edusphere-keycloak

# 5. Run migrations & seed
pnpm --filter @edusphere/db migrate
pnpm --filter @edusphere/db seed

# 6. Start subgraphs (in separate terminals)
pnpm --filter @edusphere/subgraph-core dev
pnpm --filter @edusphere/subgraph-content dev
```

## בדיקת Keycloak

1. פתח: http://localhost:8080
2. Login: admin / admin123
3. בחר Realm: edusphere
4. רשום Users: 5 users with roles
5. Test login: student@example.com / Student123!

---

## המשך ל-Phase 3

Phase 3 יכלול:
- Gateway configuration (Hive Gateway v2.7)
- Supergraph composition
- GraphQL introspection
- Frontend setup (React 19 + Vite)
