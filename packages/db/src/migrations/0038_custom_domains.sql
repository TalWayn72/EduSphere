-- F-03: Custom Domains for white-label tenant subdomain provisioning
-- Extends existing tenant_domains with RLS + verification flow

CREATE TABLE IF NOT EXISTS custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  verification_token VARCHAR(64),
  verification_record_type VARCHAR(10) DEFAULT 'TXT',
  verified_at TIMESTAMPTZ,
  ssl_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_domains_tenant_isolation ON custom_domains
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

-- Indexes
CREATE INDEX idx_custom_domains_tenant ON custom_domains (tenant_id);
CREATE UNIQUE INDEX idx_custom_domains_domain ON custom_domains (domain);
