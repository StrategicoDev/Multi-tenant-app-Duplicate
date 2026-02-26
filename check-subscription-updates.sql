-- Quick Database Check: Verify Subscription Updates
-- Run this in Supabase SQL Editor after payment

-- 1. Check current subscriptions and their tiers
SELECT 
  s.id,
  s.tier,
  s.status,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.created_at,
  s.updated_at,
  t.name as tenant_name,
  u.email as user_email
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN auth.users u ON s.user_id = u.id
ORDER BY s.updated_at DESC;

-- 2. Check if subscription was updated recently (last 10 minutes)
SELECT 
  s.tier,
  s.status,
  s.stripe_subscription_id,
  t.name as tenant_name,
  u.email,
  s.updated_at,
  EXTRACT(EPOCH FROM (NOW() - s.updated_at)) / 60 as minutes_ago
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN auth.users u ON s.user_id = u.id
WHERE s.updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY s.updated_at DESC;

-- 3. Check for any subscriptions that should be active but aren't
SELECT 
  s.tier,
  s.status,
  s.current_period_end,
  t.name as tenant_name,
  u.email
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN auth.users u ON s.user_id = u.id
WHERE s.stripe_subscription_id IS NOT NULL 
  AND s.status != 'active'
  AND s.current_period_end > NOW();

-- 4. Check subscription by specific user email
-- Replace 'user@example.com' with actual email
SELECT 
  s.*,
  t.name as tenant_name
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'sammyseoloane@gmail.com';
