-- Add Business tier to database constraints
-- Run this in Supabase SQL Editor

-- Drop existing constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

-- Add new constraint with business tier
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tier_check 
  CHECK (tier IN ('free', 'starter', 'standard', 'business', 'premium'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'subscriptions'::regclass 
  AND conname = 'subscriptions_tier_check';
