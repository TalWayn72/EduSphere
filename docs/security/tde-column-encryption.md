# PostgreSQL Column-Level Encryption (TDE)

## Overview

EduSphere uses pgcrypto column-level encryption (application-layer TDE) for PII fields
per CLAUDE.md Iron Rule SI-3: "Store plaintext email/name/annotation text" is WRONG;
`encryptField(value, tenantKey)` before every write is RIGHT.

This approach provides encryption at rest at the column level, independent of disk-level
encryption, ensuring that even a raw PostgreSQL dump cannot expose PII without the
per-tenant encryption key.

## Encrypted Fields

| Table         | Column         | Sensitivity                          |
| ------------- | -------------- | ------------------------------------ |
| `users`       | `email`        | PII — GDPR Art.4 personal data       |
| `users`       | `first_name`   | PII                                  |
| `users`       | `last_name`    | PII                                  |
| `annotations` | `content`      | Sensitive — user notes and highlights|

## Key Management

| Environment | Source                                                         |
| ----------- | -------------------------------------------------------------- |
| Development | `TENANT_ENCRYPTION_KEY` env var, fallback `dev-key-{tenantId}` |
| Staging     | HashiCorp Vault path `secret/edusphere/tenant/{tenantId}/enc-key` |
| Production  | HashiCorp Vault path `secret/edusphere/tenant/{tenantId}/enc-key` |

**Iron rules for key management:**
- Never store encryption keys in the database or application logs
- Never hard-code keys in source code
- Rotate keys quarterly via Vault's secret versioning (keep previous version active for 30 days during re-encryption)
- Key access is audited via Vault audit log

## Encryption Helper Usage (`packages/db/src/helpers/encrypt.ts`)

```typescript
import { encryptField, decryptField } from '@edusphere/db/helpers/encrypt';

// Before every PII write:
const encryptedEmail = encryptField(email, tenantEncryptionKey);

// After every PII read:
const plainEmail = decryptField(row.email, tenantEncryptionKey);
```

The `tenantEncryptionKey` is retrieved from Vault (prod) or env var (dev) by
the `TenantKeyService` injected into each NestJS subgraph service.

## pgcrypto SQL Functions

```sql
-- Verify pgcrypto is installed:
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- Encrypt (application calls this via Drizzle raw sql):
SELECT pgp_sym_encrypt('plaintext@example.com', 'tenant-encryption-key');

-- Decrypt:
SELECT pgp_sym_decrypt(email_column::bytea, 'tenant-encryption-key')
FROM users WHERE id = 'some-uuid';

-- Check if a value is encrypted (starts with pgp magic bytes):
SELECT email ~ '^\\xc0' AS is_encrypted FROM users LIMIT 5;
```

## Migration Strategy for Existing Plaintext Data

Follow this sequence to encrypt existing plaintext PII without downtime:

```sql
-- Step 1: Add encrypted column alongside plaintext
ALTER TABLE users ADD COLUMN email_encrypted bytea;

-- Step 2: Run data migration (execute per-tenant with correct key)
-- Run via application migration script, NOT directly in psql, to use app-layer keys
UPDATE users
SET email_encrypted = pgp_sym_encrypt(email, $tenantKey)
WHERE tenant_id = $tenantId;

-- Step 3: Verify all rows are encrypted
SELECT COUNT(*) FROM users
WHERE tenant_id = $tenantId AND email_encrypted IS NULL;
-- Must return 0

-- Step 4: Drop old plaintext column
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_encrypted TO email;

-- Step 5: Generate Drizzle migration to reflect schema change
-- pnpm --filter @edusphere/db generate
```

Minimum verification period before dropping the old column: **30 days**.

## Compliance Mapping

| Standard               | Clause                    | How This Satisfies It                          |
| ---------------------- | ------------------------- | ---------------------------------------------- |
| GDPR Art.32            | Technical security measures | Encryption at rest for personal data          |
| ISO 27001 A.10.1.1     | Cryptographic controls    | pgcrypto AES-256 symmetric encryption         |
| EU AI Act Art.9        | Risk management           | Data protection for AI-processed personal data|
| SOC 2 CC6.1            | Logical access controls   | Per-tenant key isolation prevents cross-read   |

## Testing

```bash
# Run encryption unit tests
pnpm --filter @edusphere/db test -- --testPathPattern=encrypt

# Run security invariant SI-3 tests
pnpm test:security -- --testPathPattern=pii-encryption
```

Test coverage requirement: **100%** for encryption/decryption round-trip and
error handling (wrong key → exception, null input → graceful empty return).

## References

- [pgcrypto documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
- [GDPR Article 32 — Security of Processing](https://gdpr.eu/article-32-security-of-processing/)
- [EduSphere Crypto Inventory](./CRYPTO_INVENTORY.md)
- [EduSphere GDPR Processing Activities](./GDPR_PROCESSING_ACTIVITIES.md)
