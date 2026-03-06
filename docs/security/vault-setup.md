# HashiCorp Vault Setup

## Overview

Vault manages secrets for production EduSphere deployments. It provides:
- Centralized secret storage with audit logging
- Per-tenant encryption key isolation
- Secret rotation without application restarts
- AppRole authentication for service-to-service access

For local development, `.env` files are used instead. The Vault compose override
(`docker-compose.vault.yml`) provides a dev-mode Vault instance for integration testing.

## Quick Start (Dev Mode)

```bash
# Start Vault alongside EduSphere infrastructure
docker-compose -f docker-compose.yml -f docker-compose.vault.yml up -d vault

# Wait for Vault to be healthy
docker-compose exec vault vault status

# Initialize secret paths (run once after container start)
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token

vault secrets enable -path=secret kv-v2

# Store EduSphere secrets
vault kv put secret/edusphere/db \
  DATABASE_URL="postgresql://edusphere:devpassword@postgres:5432/edusphere"

vault kv put secret/edusphere/keycloak \
  KEYCLOAK_CLIENT_SECRET="dev-client-secret" \
  KEYCLOAK_URL="http://keycloak:8080"

vault kv put secret/edusphere/nats \
  NATS_URL="nats://nats:4222"

vault kv put secret/edusphere/minio \
  MINIO_ACCESS_KEY="minioadmin" \
  MINIO_SECRET_KEY="minioadmin"

# Per-tenant encryption key (repeat for each tenant UUID)
vault kv put secret/edusphere/tenant/00000000-0000-0000-0000-000000000001/enc-key \
  key="$(openssl rand -hex 32)"
```

## Secret Paths Reference

| Path                                          | Contents                                     |
| --------------------------------------------- | -------------------------------------------- |
| `secret/edusphere/db`                         | `DATABASE_URL`                               |
| `secret/edusphere/keycloak`                   | `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_URL`     |
| `secret/edusphere/nats`                       | `NATS_URL`, `NATS_TLS_CERT`                  |
| `secret/edusphere/minio`                      | `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`       |
| `secret/edusphere/tenant/{tenantId}/enc-key`  | Per-tenant PII field encryption key          |
| `secret/edusphere/ai`                         | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`        |

## Application Integration (Production)

NestJS services read secrets at startup via a Vault config loader:

```typescript
// In a NestJS config provider (e.g., packages/auth/src/vault-config.ts)
import Vault from 'node-vault';

export async function vaultLoader(addr: string, token: string) {
  const vault = Vault({ apiVersion: 'v1', endpoint: addr, token });
  const db = await vault.read('secret/data/edusphere/db');
  const keycloak = await vault.read('secret/data/edusphere/keycloak');
  return {
    DATABASE_URL: db.data.data.DATABASE_URL,
    KEYCLOAK_CLIENT_SECRET: keycloak.data.data.KEYCLOAK_CLIENT_SECRET,
  };
}

// In app.module.ts
ConfigModule.forRoot({
  load: [() => vaultLoader(process.env.VAULT_ADDR!, process.env.VAULT_TOKEN!)],
  isGlobal: true,
})
```

## Secret Rotation (Zero Downtime)

```bash
# Write new version of a secret (Vault KV v2 keeps history)
vault kv put secret/edusphere/db \
  DATABASE_URL="postgresql://edusphere:newpassword@postgres:5432/edusphere"

# Application picks up new value on next config reload
# For running services: trigger graceful restart via rolling deployment
kubectl rollout restart deployment/subgraph-core

# View version history
vault kv metadata get secret/edusphere/db
```

## Production Hardening

### 1. AppRole Authentication (replace root token)

```bash
vault auth enable approle

# Create a policy for EduSphere services
vault policy write edusphere-policy - <<EOF
path "secret/data/edusphere/*" {
  capabilities = ["read"]
}
path "secret/data/edusphere/tenant/+/enc-key" {
  capabilities = ["read"]
}
EOF

# Create AppRole
vault write auth/approle/role/edusphere \
  token_policies="edusphere-policy" \
  token_ttl=1h \
  token_max_ttl=4h

# Get RoleID and SecretID for application
vault read auth/approle/role/edusphere/role-id
vault write -f auth/approle/role/edusphere/secret-id
```

### 2. Enable Audit Logging

```bash
vault audit enable file file_path=/vault/logs/audit.log
```

### 3. TLS Configuration (Production)

Vault in production must be configured with TLS. Never use dev mode
(`VAULT_DEV_ROOT_TOKEN_ID`) in production environments.

Add to Vault server config (`vault.hcl`):
```hcl
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"
}
```

## Verification

```bash
# Check Vault is sealed/unsealed
vault status

# Read a secret (confirm access works)
vault kv get secret/edusphere/db

# List audit devices
vault audit list

# View recent audit log entries
docker-compose exec vault tail -n 20 /vault/logs/audit.log
```

## Disaster Recovery

Vault uses Shamir's Secret Sharing for the unseal key. Store unseal key shares
with at least 3 designated operators. Use Vault Enterprise Autopilot for
automated unseal in Kubernetes deployments.

```bash
# Re-unseal after container restart (non-dev mode)
vault operator unseal <key-share-1>
vault operator unseal <key-share-2>
vault operator unseal <key-share-3>
```

## References

- [HashiCorp Vault documentation](https://developer.hashicorp.com/vault/docs)
- [Vault AppRole authentication](https://developer.hashicorp.com/vault/docs/auth/approle)
- [EduSphere Security Plan](./SECURITY_PLAN.md)
- [EduSphere TDE Column Encryption](./tde-column-encryption.md)
