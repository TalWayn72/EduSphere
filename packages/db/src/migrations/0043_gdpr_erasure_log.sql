-- Migration 0043: GDPR Erasure Log — cryptographic proof of data erasure
-- Stores SHA-256 hashed erasure manifests and signed verification tokens.
-- Append-only table with RLS: SUPER_ADMIN or same-tenant access.

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. Create gdpr_erasure_log table
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gdpr_erasure_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_hash  VARCHAR(64)   NOT NULL,
  tenant_id     UUID          NOT NULL,
  requested_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  tables_affected TEXT[]       NOT NULL,
  rows_deleted_count INTEGER  NOT NULL DEFAULT 0,
  erasure_hash  VARCHAR(64)   NOT NULL,
  verification_token TEXT     NOT NULL,
  requested_by  UUID          NOT NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'COMPLETED'
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. Enable RLS
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE gdpr_erasure_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY gdpr_erasure_log_rls ON gdpr_erasure_log
  USING (
    current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
    OR tenant_id::text = current_setting('app.current_tenant', TRUE)
  );

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. Indexes
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS gdpr_erasure_log_tenant_idx
  ON gdpr_erasure_log(tenant_id);

CREATE INDEX IF NOT EXISTS gdpr_erasure_log_user_hash_idx
  ON gdpr_erasure_log(user_id_hash);

CREATE INDEX IF NOT EXISTS gdpr_erasure_log_requested_at_idx
  ON gdpr_erasure_log(requested_at);
