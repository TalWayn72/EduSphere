-- Phase 59: Instructor Marketplace Payouts — add period-based payout columns
-- Extends existing instructor_payouts table with monthly revenue-share columns.

ALTER TABLE instructor_payouts
  ADD COLUMN IF NOT EXISTS period_month       TEXT,
  ADD COLUMN IF NOT EXISTS gross_revenue      INTEGER,
  ADD COLUMN IF NOT EXISTS platform_cut       INTEGER,
  ADD COLUMN IF NOT EXISTS instructor_payout  INTEGER,
  ADD COLUMN IF NOT EXISTS paid_at            TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_instructor_payouts_period
  ON instructor_payouts (instructor_id, period_month DESC);
