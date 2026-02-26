# Encryption Policy

**Document ID:** POL-008
**Version:** 1.0
**Classification:** Internal
**Owner:** CISO
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**SOC2 Trust Service Criteria:** CC6.1, CC6.7

---

## 1. Purpose

Define encryption standards and key management requirements to protect EduSphere customer data and maintain compliance with GDPR Art.32, SOC2 CC6.1, and ISO 27001 A.10.

## 2. Encryption Standards

### Symmetric Encryption

- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key size:** 256 bits
- **IV:** 12 bytes (96 bits), randomly generated per encryption operation
- **Authentication tag:** 16 bytes (128 bits) — verified before decryption
- **Usage:** PII field-level encryption in PostgreSQL

### Asymmetric Encryption

- **Algorithm:** RSA-4096 or ECDSA P-384 for key exchange and signing
- **Key exchange:** ECDH P-256 for TLS 1.3
- **JWT signing:** RS256 (Keycloak public/private key pair, 2048-bit minimum)

### Transport Layer Security

- **Minimum version:** TLS 1.3 (TLS 1.2 permitted only for legacy client compatibility with explicit approval)
- **Cipher suites (TLS 1.3):** TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
- **Certificate:** Let's Encrypt (public) or step-ca (internal mTLS)
- **HSTS:** `max-age=31536000; includeSubDomains; preload`

### Hashing

- **Passwords:** Argon2id (memory: 64MB, iterations: 3, parallelism: 4)
- **Data integrity:** SHA-256 for file checksums
- **API token format:** SHA-256 hash stored; plaintext never logged

## 3. What Must Be Encrypted

### Always Encrypted (RESTRICTED data)

| Data                                      | Location        | Method                                        |
| ----------------------------------------- | --------------- | --------------------------------------------- |
| PII fields (name, email, annotation text) | PostgreSQL      | AES-256-GCM per-tenant key (`encryptField()`) |
| API tokens, secrets                       | HashiCorp Vault | Vault transit secrets engine                  |
| Passwords                                 | Keycloak        | Argon2id                                      |
| Backups                                   | S3              | SSE-KMS with tenant CMK                       |
| Agent conversation content                | PostgreSQL      | AES-256-GCM                                   |
| Files / attachments                       | MinIO           | SSE-S3 (AES-256)                              |

### Encrypted in Transit

| Channel                   | Method                            |
| ------------------------- | --------------------------------- |
| Client ↔ Gateway          | TLS 1.3                           |
| Gateway ↔ Subgraphs       | mTLS (Linkerd service mesh)       |
| Services ↔ PostgreSQL     | TLS with certificate verification |
| Services ↔ NATS JetStream | TLS + NKey authentication         |
| Services ↔ MinIO          | TLS + HTTPS                       |
| Services ↔ Keycloak       | TLS + JWKS verification           |

## 4. Key Management

### Key Hierarchy

```
Master Key (HSM or AWS KMS CMK)
    └── Tenant Data Encryption Key (DEK) — one per tenant
            └── Field-level encryption (AES-256-GCM)
```

### Tenant Key Derivation

```typescript
// packages/db/src/helpers/encryption.ts
function deriveTenantKey(masterKey: Buffer, tenantId: string): Buffer {
  return hkdf(masterKey, tenantId, 'AES-256-GCM', 32);
}
```

### Key Storage

- **Master key:** AWS KMS CMK (FIPS 140-2 Level 2) or HashiCorp Vault (on-premises)
- **Tenant DEKs:** Derived on-demand; not stored in database
- **Never in:** Code, git, environment variables (use Vault references), CI logs

### Key Rotation

| Key Type         | Rotation Period                         | Process                                     |
| ---------------- | --------------------------------------- | ------------------------------------------- |
| Master key       | Annual                                  | KMS automated rotation; re-encrypt all DEKs |
| TLS certificates | 90 days (auto-renewal via cert-manager) | Let's Encrypt / step-ca                     |
| JWT signing keys | 180 days                                | Keycloak key rotation + JWKS cache flush    |
| NATS credentials | Annual                                  | NKey rotation via NATS account              |
| API tokens       | 90 days maximum                         | Vault lease expiry                          |

### Emergency Key Rotation

If key compromise suspected:

1. Generate new master key immediately
2. Re-encrypt all tenant data (background job)
3. Revoke old key
4. Incident documented per INCIDENT_RESPONSE_POLICY.md

## 5. Cryptographic Inventory

All cryptographic implementations are documented and inventoried in `docs/security/CRYPTO_INVENTORY.md`. Deprecated algorithms:

| Algorithm     | Status                    | Replacement |
| ------------- | ------------------------- | ----------- |
| AES-128       | Deprecated                | AES-256-GCM |
| RSA-1024/2048 | Deprecated for encryption | ECDSA P-384 |
| SHA-1         | Forbidden                 | SHA-256     |
| MD5           | Forbidden                 | SHA-256     |
| TLS 1.0/1.1   | Forbidden                 | TLS 1.3     |
| 3DES          | Forbidden                 | AES-256-GCM |

## 6. Compliance References

- **GDPR Art.32:** Appropriate technical measures — encryption named explicitly
- **SOC2 CC6.1:** Encryption of data at rest and in transit
- **NIST SP 800-175B:** Guideline for Using Cryptographic Standards
- **FIPS 140-2:** Required for US government customers; available via AWS KMS

## 7. Related Documents

- [DATA_CLASSIFICATION_POLICY.md](./DATA_CLASSIFICATION_POLICY.md)
- [packages/db/src/helpers/encryption.ts](../../packages/db/src/helpers/encryption.ts)
- [docs/deployment/SECURITY_HARDENING.md](../deployment/SECURITY_HARDENING.md)
