# Payment Flow Verification Guide

## Overview
This document verifies that the subscription payment automatically updates the user's tier after successful payment.

## Complete Payment Flow

### 1. **User Selects Plan** (Pricing Page)
- User clicks "Subscribe Now" on a paid plan (Starter, Standard, or Premium)
- Code: `src/pages/Pricing.tsx` → `handleSelectPlan()`

**What happens:**
```typescript
// Calls create-checkout Edge Function with:
- priceId: Stripe price ID (e.g., 'price_xxx')
- tier: Plan tier ('starter', 'standard', or 'premium')
```

---

### 2. **Create Checkout Session** (Edge Function)
- Edge Function: `supabase/functions/create-checkout/index.ts`

**What happens:**
```typescript
// 1. Validates user authentication (JWT)
// 2. Gets user's tenant_id from profiles table
// 3. Creates or retrieves Stripe customer
// 4. Creates Stripe checkout session with metadata:
metadata: {
  user_id: user.id,
  tenant_id: userProfile.tenant_id,
  tier: tier  // ← THIS IS KEY! Tier is passed to Stripe
}
```

**Returns:** Stripe checkout URL

---

### 3. **User Completes Payment** (Stripe)
- User is redirected to Stripe-hosted checkout page
- User enters payment details and completes purchase
- Stripe processes payment

---

### 4. **Stripe Sends Webhook** (Automatic)
- Event: `checkout.session.completed`
- Stripe sends webhook to: `https://gbbfgsnwueteyqwfbstw.supabase.co/functions/v1/stripe-webhook`

---

### 5. **Webhook Updates Database** (Edge Function)
- Edge Function: `supabase/functions/stripe-webhook/index.ts`

**What happens:**
```typescript
case 'checkout.session.completed': {
  // 1. Extract metadata from session
  const tenantId = session.metadata?.tenant_id
  const tier = session.metadata?.tier  // ← Tier from checkout
  
  // 2. Get subscription details from Stripe
  const subscriptionData = await stripe.subscriptions.retrieve(...)
  
  // 3. UPDATE subscriptions table
  await supabaseAdmin
    .from('subscriptions')
    .update({
      tier: tier,  // ← USER'S TIER IS UPDATED HERE!
      status: 'active',
      stripe_subscription_id: subscriptionData.id,
      current_period_start: ...,
      current_period_end: ...,
      cancel_at_period_end: false,
    })
    .eq('tenant_id', tenantId)
}
```

---

### 6. **User Returns to Dashboard**
- Stripe redirects to: `/dashboard?success=true`
- Dashboard fetches updated subscription data

**Component:** `src/components/SubscriptionManagement.tsx`

**What happens:**
```typescript
// 1. Fetches subscription from database
const { data } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('tenant_id', userProfile.tenant_id)
  .single()

// 2. Displays current tier with features
currentPlan = PRICING_PLANS[subscription.tier]  // ← Shows updated tier!
```

---

## Database Schema

### `subscriptions` Table
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  tier TEXT CHECK (tier IN ('free', 'starter', 'standard', 'premium')),
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Verification Checklist

### ✅ **Pre-Payment Checks**
1. [ ] User has active session (authenticated)
2. [ ] User's `profiles` has valid `tenant_id`
3. [ ] Subscription exists for tenant in `subscriptions` table
4. [ ] Stripe API keys are configured (STRIPE_SECRET_KEY)
5. [ ] Edge Functions are deployed

### ✅ **During Payment**
1. [ ] Checkout session created successfully
2. [ ] Session metadata includes: `user_id`, `tenant_id`, `tier`
3. [ ] User redirected to Stripe checkout page
4. [ ] Payment processes successfully

### ✅ **Post-Payment (Webhook)**
1. [ ] Webhook receives `checkout.session.completed` event
2. [ ] STRIPE_WEBHOOK_SECRET is configured
3. [ ] Webhook signature validates successfully
4. [ ] Subscription retrieved from Stripe
5. [ ] Database updated with:
   - ✅ tier (from metadata)
   - ✅ status ('active')
   - ✅ stripe_subscription_id
   - ✅ current_period_start
   - ✅ current_period_end

### ✅ **Dashboard Display**
1. [ ] Subscription data fetched from database
2. [ ] Correct tier displayed (Starter/Standard/Premium)
3. [ ] Status shows 'ACTIVE'
4. [ ] Features list matches selected plan
5. [ ] Billing period dates shown

---

## Testing Steps

### 1. **Manual Test**
```bash
# 1. Login to your app
# 2. Navigate to /pricing
# 3. Click "Subscribe Now" on Standard plan
# 4. Complete payment with Stripe test card: 4242 4242 4242 4242
# 5. Verify redirect to /dashboard?success=true
# 6. Check subscription shows:
#    - Tier: Standard
#    - Status: ACTIVE
#    - Features: All standard tier features
```

### 2. **Check Database Directly**
```sql
-- Run in Supabase SQL Editor
SELECT 
  s.tier,
  s.status,
  s.stripe_subscription_id,
  s.current_period_end,
  t.name as tenant_name,
  p.email
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN profiles p ON s.user_id = p.id
WHERE p.email = 'your-email@example.com';
```

### 3. **Check Webhook Logs**
```bash
# View function logs in Supabase Dashboard
# https://supabase.com/dashboard/project/gbbfgsnwueteyqwfbstw/functions/stripe-webhook

# Look for:
# ✅ "🔔 Webhook received: checkout.session.completed"
# ✅ "💳 Checkout session completed: cs_xxx"
# ✅ "✅ Subscription updated successfully"
```

### 4. **Check Stripe Dashboard**
```
# https://dashboard.stripe.com/test/subscriptions

# Verify:
# ✅ Subscription created
# ✅ Status: Active
# ✅ Metadata contains: user_id, tenant_id, tier
```

---

## Troubleshooting

### Issue: Tier Not Updating

**Possible Causes:**
1. ❌ Webhook not configured in Stripe Dashboard
2. ❌ STRIPE_WEBHOOK_SECRET missing/incorrect
3. ❌ Edge Function not deployed
4. ❌ Metadata not passed from checkout to webhook

**Solutions:**
```bash
# 1. Verify webhook endpoint in Stripe Dashboard:
# URL: https://gbbfgsnwueteyqwfbstw.supabase.co/functions/v1/stripe-webhook
# Events: checkout.session.completed, customer.subscription.*

# 2. Check webhook secret is set:
supabase secrets list --project-ref gbbfgsnwueteyqwfbstw

# 3. Redeploy webhook function:
supabase functions deploy stripe-webhook

# 4. Check webhook logs for errors
```

### Issue: Database Not Updating

**Check RLS Policies:**
```sql
-- Service role should bypass RLS, but verify policy exists:
SELECT * FROM pg_policies 
WHERE tablename = 'subscriptions' 
AND policyname = 'Service role can manage all subscriptions';
```

---

## Expected Result

After successful payment, the database should show:

```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "tenant_id": "tenant-uuid",
  "tier": "standard",           // ← Updated from 'free'
  "status": "active",            // ← Updated from 'trialing'
  "stripe_customer_id": "cus_xxx",
  "stripe_subscription_id": "sub_xxx",  // ← New
  "current_period_start": "2026-02-26T10:00:00Z",  // ← New
  "current_period_end": "2026-03-26T10:00:00Z",     // ← New
  "cancel_at_period_end": false,
  "updated_at": "2026-02-26T10:00:05Z"  // ← Updated
}
```

---

## Summary

✅ **The payment flow DOES automatically update the user's tier** through:
1. Checkout metadata passes tier from frontend → Stripe
2. Webhook receives tier from Stripe → Database
3. Dashboard reads tier from Database → Display

The entire flow is **FULLY AUTOMATED** - no manual intervention required!
