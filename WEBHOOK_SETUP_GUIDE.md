# Stripe Webhook Setup Guide

## Problem
Payment completed successfully in Stripe, but the subscription tier didn't auto-update in the database.

## Root Cause
The Stripe webhook is not configured to send events to your Supabase Edge Function.

---

## ✅ Solution: Configure Stripe Webhook

### Step 1: Get Your Webhook Endpoint URL
```
https://gbbfgsnwueteyqwfbstw.supabase.co/functions/v1/stripe-webhook
```

### Step 2: Configure in Stripe Dashboard

1. **Go to Stripe Dashboard**
   - Test Mode: https://dashboard.stripe.com/test/webhooks
   - Live Mode: https://dashboard.stripe.com/webhooks

2. **Click "Add endpoint"**

3. **Endpoint URL**
   ```
   https://gbbfgsnwueteyqwfbstw.supabase.co/functions/v1/stripe-webhook
   ```

4. **Description** (optional)
   ```
   Supabase subscription updates
   ```

5. **Select events to listen to**
   
   Click "Select events" and choose:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

   Or use "Select all customer events" for comprehensive coverage

6. **Click "Add endpoint"**

### Step 3: Get Webhook Signing Secret

After creating the endpoint:

1. Click on your new webhook endpoint
2. Click "Reveal" next to "Signing secret"
3. Copy the secret (starts with `whsec_`)

### Step 4: Update Supabase Secret

Run this command in your terminal:

```bash
# Replace whsec_xxxxx with your actual signing secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx --project-ref gbbfgsnwueteyqwfbstw
```

Or update it in Supabase Dashboard:
- Dashboard: https://supabase.com/dashboard/project/gbbfgsnwueteyqwfbstw/settings/edge-functions
- Click "Manage secrets"
- Update `STRIPE_WEBHOOK_SECRET`

### Step 5: Test the Webhook

1. In Stripe Dashboard, go to your webhook
2. Click "Send test webhook"
3. Select `checkout.session.completed`
4. Click "Send test webhook"

5. Check function logs:
   - https://supabase.com/dashboard/project/gbbfgsnwueteyqwfbstw/functions/stripe-webhook
   - Should see: `🔔 Webhook received: checkout.session.completed`

---

## 🔧 Immediate Fix: Manual Update

While waiting for webhook setup, you can manually update your subscription:

### Option 1: Using Stripe Dashboard Data

1. **Get Subscription Details from Stripe**
   - Go to: https://dashboard.stripe.com/test/subscriptions
   - Find your subscription
   - Copy the Subscription ID (starts with `sub_`)
   - Note the tier you subscribed to

2. **Run SQL Update**
   - Open: https://supabase.com/dashboard/project/gbbfgsnwueteyqwfbstw/sql/new
   - Use the script in `manual-subscription-fix.sql`
   - Update the values (tier, subscription_id)
   - Execute the query

### Option 2: Using Edge Function (Recommended)

We can create a one-time sync function:

```bash
# Deploy the updated webhook
supabase functions deploy stripe-webhook
```

Then manually trigger it with your checkout session ID from Stripe.

---

## 🧪 Verify Everything Works

After webhook is configured:

1. **Test a new payment**
   - Go to /pricing
   - Select a different tier
   - Use test card: `4242 4242 4242 4242`
   - Complete checkout

2. **Check webhook logs**
   - Dashboard: https://supabase.com/dashboard/project/gbbfgsnwueteyqwfbstw/functions/stripe-webhook
   - Look for:
     ```
     🔔 Webhook received: checkout.session.completed
     💳 Checkout session completed: cs_xxxxx
     ✅ Subscription updated successfully!
     ```

3. **Verify database**
   - Run: `check-subscription-updates.sql`
   - Tier should be updated
   - Status should be 'active'

---

## 📊 Check Current Webhook Status

### In Stripe Dashboard:
1. Go to Webhooks
2. Check if endpoint exists for your Supabase URL
3. Check "Event type" has the required events
4. Check "Signing secret" is set in Supabase

### In Supabase:
```bash
# Check if webhook secret is set
supabase secrets list --project-ref gbbfgsnwueteyqwfbstw
```

Look for `STRIPE_WEBHOOK_SECRET`

---

## ⚠️ Common Issues

### Issue: "Webhook signature verification failed"
**Solution:** Make sure STRIPE_WEBHOOK_SECRET matches the signing secret from Stripe Dashboard

### Issue: "404 Not Found" on webhook
**Solution:** Redeploy the function:
```bash
supabase functions deploy stripe-webhook
```

### Issue: Events not reaching webhook
**Solution:** 
- Check webhook is enabled in Stripe Dashboard
- Verify URL is exactly: `https://gbbfgsnwueteyqwfbstw.supabase.co/functions/v1/stripe-webhook`
- Test mode events go to test mode webhooks only

### Issue: Database not updating
**Solution:**
- Check function logs for errors
- Verify RLS policies allow service role to update
- Check tenant_id exists in metadata

---

## 🎯 Next Steps

1. [ ] Configure webhook in Stripe Dashboard
2. [ ] Update STRIPE_WEBHOOK_SECRET in Supabase
3. [ ] Redeploy webhook function
4. [ ] Test with new payment
5. [ ] Manually fix current subscription (if needed)

---

## 📞 Get Help

If issues persist:
1. Check Stripe webhook logs: https://dashboard.stripe.com/test/webhooks
2. Check Supabase function logs: https://supabase.com/dashboard/project/gbbfgsnwueteyqwfbstw/functions/stripe-webhook
3. Run diagnostic queries in `check-subscription-updates.sql`
