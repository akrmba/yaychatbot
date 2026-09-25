-- Migration: add_billing_fields
-- Adds Stripe metered subscription item, trial end date, cost cap, and overage flag to Organization

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "stripeMeteredSubItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "trialEndsAt"            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "costCapCents"            INTEGER,
  ADD COLUMN IF NOT EXISTS "overageFlagged"          BOOLEAN NOT NULL DEFAULT FALSE;
