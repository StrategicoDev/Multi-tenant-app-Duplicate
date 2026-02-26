-- Quick Check: Did the Latest Payment Update the Subscription?
-- Run this in Supabase SQL Editor

-- Check your most recent subscription status
SELECT 
  s.tier,
  s.status,
  s.stripe_subscription_id,
  s.current_period_start,
  s.current_period_end,
  s.updated_at,
  t.name as tenant_name,
  u.email
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'sammyseoloane@gmail.com'
ORDER BY s.updated_at DESC
LIMIT 1;

-- Check if subscription was updated in last 5 minutes
SELECT 
  CASE 
    WHEN s.updated_at > NOW() - INTERVAL '5 minutes' THEN '✅ RECENTLY UPDATED'
    ELSE '❌ NOT UPDATED RECENTLY'
  END as update_status,
  s.tier,
  s.status,
  EXTRACT(EPOCH FROM (NOW() - s.updated_at)) / 60 as minutes_since_update
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'sammyseoloane@gmail.com';
