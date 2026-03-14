-- Add Stripe Connect-related columns to support seller onboarding and transfer tracking.
ALTER TABLE contracts ADD COLUMN seller_stripe_account_id TEXT;
ALTER TABLE contracts ADD COLUMN stripe_transfer_id TEXT;
