-- Manual Subscription Fix Script
-- Use this to manually update subscription after successful Stripe payment

-- ==============================================================================
-- STEP 1: Find your subscription and Stripe customer ID
-- ==============================================================================
SELECT 
  s.id as subscription_id,
  s.tier as current_tier,
  s.status as current_status,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  t.name as tenant_name,
  u.email as user_email
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'sammyseoloane@gmail.com';

-- ==============================================================================
-- STEP 2: Manual Update (ONLY run if payment was successful in Stripe)
-- Replace these values with your actual data from Stripe Dashboard:
-- - 'standard' = the tier you paid for (starter/standard/premium)
-- - 'sub_xxxxx' = your Stripe subscription ID from Stripe Dashboard
-- - tenant_id = from the query above
-- ==============================================================================

-- UNCOMMENT AND MODIFY THIS QUERY AFTER CHECKING STRIPE DASHBOARD:
/*
UPDATE subscriptions
SET 
  tier = 'standard',  -- Change this to: starter, standard, or premium
  status = 'active',
  stripe_subscription_id = 'sub_xxxxxxxxxxxxx',  -- From Stripe Dashboard
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month',
  cancel_at_period_end = false,
  updated_at = NOW()
WHERE tenant_id = (
  SELECT tenant_id 
  FROM profiles 
  WHERE id = (
    SELECT id FROM auth.users WHERE email = 'sammyseoloane@gmail.com'
  )
);
*/

-- ==============================================================================
-- STEP 3: Verify the update
-- ==============================================================================
SELECT 
  s.tier,
  s.status,
  s.stripe_subscription_id,
  s.current_period_end,
  s.updated_at,
  t.name as tenant_name,
  u.email
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'sammyseoloane@gmail.com';
