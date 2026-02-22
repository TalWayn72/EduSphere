# Cryptographic Implementation Inventory

**Document ID:** SEC-CRYPTO-001
**Version:** 1.0
**Owner:** CISO
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**Policy Reference:** docs/policies/ENCRYPTION_POLICY.md (POL-008)
**SOC2 Trust Service Criteria:** CC6.1, CC6.7
**NIST Reference:** SP 800-175B, FIPS 140-2

---

## Purpose

This inventory documents every cryptographic algorithm, key, and implementation in EduSphere.
It is used to:
1. Track algorithm lifecycle (approved -> deprecated -> forbidden)
2. Ensure no forbidden algorithms are in use
3. Plan key rotation schedules
4. Demonstrate compliance (SOC2, ISO 27001 A.10, GDPR Art.32)

---

## 1. Symmetric Encryption

### 1.1 AES-256-GCM -- PII Field-Level Encryption

| Attribute | Value |
|-----------|-------|
| **Algorithm** | AES-256-GCM (Galois/Counter Mode) |
| **Key Size** | 256 bits (32 bytes) |
| **IV (Nonce)** | 12 bytes (96 bits) -- randomly generated per call via `crypto.randomBytes(12)` |
| **Auth Tag** | 16 bytes (128 bits) -- verified via `setAuthTag()` before decryption |
| **Key Derivation** | HMAC-SHA256(ENCRYPTION_MASTER_KEY, tenantId) -> 32-byte tenant DEK |
| **Status** | Approved |
| **Implementation** | `packages/db/src/helpers/encryption.ts` |
| **Used For** | PII fields: name, email, annotation text, agent messages |
| **Key Storage** | `ENCRYPTION_MASTER_KEY` env var (min 32 chars) |
| **Output Format** | `<iv_hex>:<authTag_hex>:<ciphertext_hex>` |
| **Rotation** | Master key: annual; tenant DEKs re-derived on-demand |

#### Code Reference

```typescript
// packages/db/src/helpers/encryption.ts
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;       // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
// encryptField(value, tenantKey) -> '<iv>:<authTag>:<ciphertext>'
// decryptField(ciphertext, tenantKey) -> plaintext (verifies authTag)
```

---

## 2. Key Derivation

### 2.1 HMAC-SHA256 -- Tenant Key Derivation

| Attribute | Value |
|-----------|-------|
| **Algorithm** | HMAC-SHA256 |
| **Input** | `ENCRYPTION_MASTER_KEY` (min 256-bit) + `tenantId` (UUID v4) |
| **Output** | 32-byte tenant encryption key (DEK) |
| **Status** | Approved |
| **Implementation** | `packages/db/src/helpers/encryption.ts` -- `deriveTenantKey(tenantId)` |
| **Note** | One DEK per tenant; derived on demand, never persisted to disk |

#### Code Reference

```typescript
// packages/db/src/helpers/encryption.ts
export function deriveTenantKey(tenantId: string): Buffer {
  return createHmac('sha256', Buffer.from(masterKey, 'utf8'))
    .update(tenantId).digest().subarray(0, KEY_LENGTH); // 32 bytes
}
```

### 2.2 HKDF (RFC 5869) -- Advanced Key Derivation

| Attribute | Value |
|-----------|-------|
| **Algorithm** | HKDF-SHA256 (HMAC-based Extract-and-Expand Key Derivation Function) |
| **Standard** | RFC 5869 |
| **Input** | IKM (Input Key Material) + optional salt + context info |
| **Output** | Derived key material (configurable length) |
| **Status** | Approved (recommended for future multi-tenant key hierarchy) |
| **Used For** | Tenant key derivation where strict RFC 5869 compliance is required |
| **Note** | Current implementation uses HMAC-SHA256 directly (equivalent for single-extract use case). HKDF formalizes this pattern with explicit extract + expand phases. |

HKDF is used as the recommended standard per NIST SP 800-56C Rev. 2 for key derivation functions.
The current `deriveTenantKey()` implements the HKDF-Extract phase (HMAC with fixed salt pattern).

---

### 2.3 Argon2id -- Password Hashing

| Attribute | Value |
|-----------|-------|
| **Algorithm** | Argon2id |
| **Memory** | 64 MB |
| **Iterations** | 3 |
| **Parallelism** | 4 |
| **Output Length** | 32 bytes |
| **Status** | Approved |
| **Implementation** | Keycloak internal (not in application code) |
| **Used For** | User passwords (Keycloak realm: `edusphere`) |

---

## 3. Transport Layer Security

### 3.1 TLS 1.3 -- External Communications

| Attribute | Value |
|-----------|-------|
| **Protocol** | TLS 1.3 |
| **Cipher Suites** | TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256 |
| **Certificate** | Let's Encrypt (public) / step-ca (internal) |
| **HSTS** | `max-age=31536000; includeSubDomains; preload` |
| **Status** | Approved |
| **Applies To** | All external-facing endpoints (Hive Gateway port 4000, health endpoints) |

### 3.2 mTLS (Linkerd) -- Inter-Service Communication

| Attribute | Value |
|-----------|-------|
| **Protocol** | TLS 1.3 with mutual authentication |
| **Certificate Rotation** | Automatic (Linkerd cert-manager, 24h TTL) |
| **Status** | Approved (production) |
| **Applies To** | All service-to-service communication within Kubernetes cluster |
| **Security Invariant** | SI-6: inter-service URLs must use mTLS or https:// -- never plain http:// |

### 3.3 NATS -- TLS + NKey Authentication

| Attribute | Value |
|-----------|-------|
| **Protocol** | TLS 1.3 for transport (when NATS_TLS_CERT + NATS_TLS_KEY + NATS_TLS_CA are set) |
| **Auth** | NKey (`nkeyAuthenticator`) -- Ed25519 public key cryptography |
| **Status** | Approved |
| **Implementation** | `packages/nats-client/src/connection.ts` -- `buildNatsOptions()` |
| **Security Invariant** | SI-7: NATS must use TLS + authenticator in production |

#### Code Reference

```typescript
// packages/nats-client/src/connection.ts
// TLS activated when NATS_TLS_CERT + NATS_TLS_KEY + NATS_TLS_CA are all set.
// NKey authentication activated when NATS_NKEY is set.
options.authenticator = nkeyAuthenticator(new TextEncoder().encode(nkey));
```

---

## 4. Hashing and Message Integrity

### 4.1 SHA-256 -- General Hashing

| Attribute | Value |
|-----------|-------|
| **Algorithm** | SHA-256 |
| **Status** | Approved |
| **Used For** | File checksums, HMAC base in key derivation, API token storage |

### 4.2 JWT -- Token Signing (RS256)

| Attribute | Value |
|-----------|-------|
| **Algorithm** | RS256 (RSA-PKCS1v15 with SHA-256) |
| **Key Size** | 2048-bit RSA minimum (Keycloak default) |
| **Issuer** | Keycloak realm `edusphere` |
| **Verification** | `jose` library -- `jwtVerify()` against Keycloak JWKS endpoint |
| **Token Lifetime** | Access token: 15 min; Refresh token: 30 days |
| **Status** | Approved |
| **Implementation** | `apps/gateway/src/index.ts` -- JWKS URI from `KEYCLOAK_JWKS_URL` |
| **Security Invariant** | Gateway validates JWT; tenant_id from JWT claims -- never from client input |

### 4.3 SCRAM-SHA-256 -- PgBouncer Authentication

| Attribute | Value |
|-----------|-------|
| **Algorithm** | SCRAM-SHA-256 (RFC 5802) |
| **Status** | Approved |
| **Implementation** | `infrastructure/pgbouncer/pgbouncer.ini` -- `auth_type = scram-sha-256` |
| **Applies To** | All NestJS subgraph connections to PgBouncer (port 5432) |

#### Config Reference

```ini
; infrastructure/pgbouncer/pgbouncer.ini
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
```

### 4.4 Ed25519 -- NATS NKey Authentication

| Attribute | Value |
|-----------|-------|
| **Algorithm** | Ed25519 (used internally by NKey framework) |
| **Status** | Approved |
| **Implementation** | `packages/nats-client/src/connection.ts` |

---

## 5. Storage Encryption

### 5.1 MinIO SSE-S3 -- Object Storage

| Attribute | Value |
|-----------|-------|
| **Algorithm** | AES-256 (SSE-S3 managed) |
| **Status** | Approved |
| **Configuration** | MinIO server-side encryption (Vault KMS in production) |
| **Test Coverage** | `tests/security/minio-config.spec.ts` |

### 5.2 PostgreSQL -- Volume Encryption

| Attribute | Value |
|-----------|-------|
| **Algorithm** | AES-256-XTS (Linux dm-crypt / LUKS -- infrastructure level) |
| **Status** | Approved |
| **Managed By** | AWS EBS encryption (cloud deployment) / LUKS (on-premises) |

---

## 6. Deprecated and Forbidden Algorithms

| Algorithm | Status | Reason | Replaced By |
|-----------|--------|--------|-------------|
| MD5 | FORBIDDEN | Collision attacks (RFC 6151) | SHA-256 |
| SHA-1 | FORBIDDEN | Collision attacks (SHAttered 2017) | SHA-256 |
| AES-128 | DEPRECATED | Insufficient key length for long-term PII | AES-256-GCM |
| 3DES | FORBIDDEN | SWEET32 attack; deprecated NIST SP 800-131A | AES-256-GCM |
| RSA-1024 | FORBIDDEN | Insufficient key length | RSA-2048+ or ECDSA P-384 |
| TLS 1.0 | FORBIDDEN | POODLE, BEAST attacks; deprecated RFC 8996 | TLS 1.3 |
| TLS 1.1 | FORBIDDEN | Deprecated RFC 8996 | TLS 1.3 |
| RC4 | FORBIDDEN | Multiple attacks (RFC 7465) | AES-256-GCM |
| AES-ECB | FORBIDDEN | Deterministic -- reveals plaintext patterns | AES-256-GCM |
| md5 (PgBouncer auth_type) | FORBIDDEN | Deprecated in PostgreSQL 16 | scram-sha-256 |

**Enforcement:** `tests/security/pii-encryption.spec.ts` verifies AES-256-GCM is used.
`tests/security/crypto-inventory.spec.ts` verifies no forbidden algorithms appear in config files.
CI blocks any PR introducing a forbidden algorithm.

---

## 7. Key Rotation Schedule

| Key Type | Rotation Period | Process | Owner |
|---------|----------------|---------|-------|
| `ENCRYPTION_MASTER_KEY` (PII DEK master) | Annual | Vault key rotation + re-encrypt PII fields | DevOps + DBA |
| TLS certificates (public, Let's Encrypt) | 90 days (automated) | cert-manager auto-renew | DevOps |
| TLS certificates (internal, Linkerd) | 24 hours (automated) | Linkerd cert-manager | DevOps |
| JWT signing keys (Keycloak RS256) | 180 days | Keycloak key rotation + JWKS cache flush | DevOps |
| NATS NKey credentials | Annual | NKey rotation via NATS account server | DevOps |
| PgBouncer SCRAM credentials | 90 days | Vault lease renewal -> pgbouncer userlist.txt | DevOps |
| MinIO SSE keys | Annual (Vault managed) | MinIO KMS key rotation | DevOps |

---

## 8. Compliance Mapping

| Requirement | Control | Implementation | Status |
|-------------|---------|---------------|--------|
| GDPR Art.32 -- Encryption at rest | AES-256-GCM field-level PII | `packages/db/src/helpers/encryption.ts` | Approved |
| GDPR Art.32 -- Encryption in transit | TLS 1.3 + mTLS | Linkerd service mesh + gateway TLS | Approved |
| SOC2 CC6.1 -- Logical access + encryption | AES-256-GCM + JWT RS256 | Encryption helpers + Keycloak | Approved |
| SOC2 CC6.7 -- Data transmission encryption | TLS 1.3 + mTLS + NATS TLS | All transports covered | Approved |
| ISO 27001 A.10 -- Cryptography policy | This inventory + rotation schedule | CRYPTO_INVENTORY.md | Approved |
| NIST SP 800-175B -- Algorithm approval | All algorithms NIST-approved | No forbidden algorithms in use | Approved |
| FIPS 140-2 -- Validated modules | AWS KMS CMK (FIPS validated) | Cloud deployment | Approved |
| SI-3 -- PII field encryption | AES-256-GCM per `encryptField()` | `packages/db/src/helpers/encryption.ts` | Approved |
| SI-7 -- NATS TLS + auth | TLS + NKey in production | `packages/nats-client/src/connection.ts` | Approved |

---

## 9. Test Coverage

| Test File | What It Validates |
|-----------|------------------|
| `tests/security/pii-encryption.spec.ts` | AES-256-GCM used, random IV, authTag verified (SI-3) |
| `tests/security/nats-security.spec.ts` | NATS TLS + authenticator in production (SI-7) |
| `tests/security/minio-config.spec.ts` | MinIO server-side encryption enabled |
| `tests/security/crypto-inventory.spec.ts` | Inventory completeness, forbidden algorithms absent from configs |
