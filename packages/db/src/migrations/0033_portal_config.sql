-- Phase 63: No-Code Portal Builder — add portal_config JSON to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_config JSONB DEFAULT '{}';
