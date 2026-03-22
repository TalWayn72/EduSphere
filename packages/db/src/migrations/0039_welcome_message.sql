-- Migration 0039: Add welcome_message column to tenant_branding
-- Used by BrandedLoginPage to display a custom welcome message on org login pages

ALTER TABLE tenant_branding ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT '';
