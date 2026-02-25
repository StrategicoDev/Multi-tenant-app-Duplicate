# Stripe Subscription Setup Guide

This guide will walk you through setting up Stripe subscriptions with automatic payment processing for your multi-tenant application.

## Overview

The pricing tier structure includes:
- 🟢 **Free (Trial)** – R0/month
- 🔵 **Starter** – R60/month
- 🟡 **Standard** – R80/month  
- 🔴 **Premium** – R120/month

## Prerequisites

- Stripe account created
- Supabase project set up
- Application running locally or deployed

## Step 1: Set Up Stripe Products and Prices

### 1.1 Create Products in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** > **Add Product**
3. Create the following products:

#### Starter Plan
- **Name**: Starter Plan
- **Description**: Perfect for small teams
- **Pricing**: R60.00 ZAR / month (recurring)
- **Price ID**: Copy this after creation (e.g., `price_xxxxxxxxxxxxx`)

#### Standard Plan
- **Name**: Standard Plan
- **Description**: Best for growing businesses
- **Pricing**: R80.00 ZAR / month (recurring)
- **Price ID**: Copy this after creation

#### Premium Plan
- **Name**: Premium Plan
- **Description**: For large enterprises
- **Pricing**: R120.00 ZAR / month (recurring)
- **Price ID**: Copy this after creation

### 1.2 Get Your Stripe API Keys

1. Go to **Developers** > **API keys**
2. Copy your keys:
   - **Publishable key**: `pk_live_...` or `pk_test_...` for testing
   - **Secret key**: `sk_live_...` or `sk_test_...` for testing

⚠️ **Important**: The key provided (`rk_live_...`) appears to be a restricted key. You'll need the full secret key (`sk_live_...`) for server-side operations.

## Step 2: Update Environment Variables

### 2.1 Update `.env` file

```env
# Stripe API Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY

# Stripe Price IDs
VITE_STRIPE_STARTER_PRICE_ID=price_YOUR_STARTER_PRICE_ID
VITE_STRIPE_STANDARD_PRICE_ID=price_YOUR_STANDARD_PRICE_ID
VITE_STRIPE_PREMIUM_PRICE_ID=price_YOUR_PREMIUM_PRICE_ID

# Stripe Webhook Secret (from Step 4)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### 2.2 Update Supabase Secrets

Add these secrets to your Supabase project:

```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY

# Set webhook secret (after creating webhook in Step 4)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

## Step 3: Set Up Database

**IMPORTANT:** Run the SQL scripts in the correct order:

### 3.1 Prerequisites
Make sure you've already run these setup scripts:
1. `supabase-setup.sql` - Creates tenants and profiles tables
2. `fix-multi-tenant-support.sql` - Updates tenant handling logic

### 3.2 Run Subscription Setup

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL file directly in Supabase SQL Editor
# Go to SQL Editor in Supabase Dashboard
# Copy contents of subscription-setup.sql and execute
```

If you get the error `relation "public.profiles" does not exist`, run the prerequisite scripts first.

The SQL script creates:
- `subscriptions` table
- RLS policies for secure access
- Triggers for auto-initialization of free 14-day trial subscriptions
- Indexes for performance

## Step 4: Deploy Supabase Edge Functions

### 4.1 Deploy create-checkout function

```bash
supabase functions deploy create-checkout
```

This function creates Stripe checkout sessions for subscription purchases.

### 4.2 Deploy create-billing-portal function

```bash
supabase functions deploy create-billing-portal
```

This function creates Stripe billing portal sessions for subscription management.

### 4.3 Deploy stripe-webhook function

```bash
supabase functions deploy stripe-webhook
```

This function handles Stripe webhook events (payments, cancellations, etc.).

## Step 5: Configure Stripe Webhooks

### 5.1 Get Your Webhook URL

Your webhook URL will be:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

Replace `YOUR_PROJECT_REF` with your Supabase project reference.

### 5.2 Create Webhook in Stripe

1. Go to **Developers** > **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your webhook URL
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to your environment variables (see Step 2.2)

## Step 6: Test the Integration

### 6.1 Use Stripe Test Mode

For testing, use test API keys:
- Publishable: `pk_test_...`
- Secret: `sk_test_...`

Test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

### 6.2 Test Subscription Flow

1. Navigate to `/pricing` in your app
2. Click "Subscribe Now" on any paid plan
3. Fill in test card details
4. Complete checkout
5. Verify subscription appears in dashboard
6. Check Stripe Dashboard for the subscription

### 6.3 Test Billing Portal

1. Go to Owner Dashboard
2. Click "Manage Billing" in Subscription section
3. Verify you can update card, view invoices, cancel subscription

## Step 7: Enable Customer Portal in Stripe

1. Go to **Settings** > **Billing** > **Customer portal**
2. Enable the customer portal
3. Configure allowed actions:
   - ✅ Update payment method
   - ✅ View invoice history
   - ✅ Cancel subscription
   - ✅ Update subscription (upgrade/downgrade)
4. Set cancellation behavior (immediate or at period end)
5. Save settings

## Step 8: Go Live

### 8.1 Switch to Live Mode

1. Replace test API keys with live keys in `.env`
2. Update Supabase secrets with live keys
3. Verify webhook is set to live mode in Stripe
4. Test with real card (small amount)
5. Cancel test subscription immediately

### 8.2 Security Checklist

- ✅ Never expose secret keys in frontend code
- ✅ All payment processing happens server-side (edge functions)
- ✅ Webhook signature verification is enabled
- ✅ RLS policies protect subscription data
- ✅ Environment variables are properly secured

## Troubleshooting

### Checkout Session Creation Fails

**Error**: "Failed to start checkout"

**Solutions**:
- Check Stripe secret key is correct in Supabase secrets
- Verify price IDs are correct in environment variables
- Check edge function logs: `supabase functions logs create-checkout`
- Ensure user is authenticated

### Webhook Not Working

**Error**: Subscription status not updating after payment

**Solutions**:
- Verify webhook secret is correct
- Check webhook is listening to correct events
- View webhook attempts in Stripe Dashboard
- Check edge function logs: `supabase functions logs stripe-webhook`
- Test webhook with Stripe CLI: `stripe trigger checkout.session.completed`

### Subscription Not Showing in Dashboard

**Solutions**:
- Check RLS policies allow user to view subscription
- Verify user is associated with a tenant
- Check database for subscription record
- Ensure free subscription was created on tenant creation

## Additional Resources

- [Stripe API Documentation](https://docs.stripe.com/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

## Support

For issues specific to:
- **Stripe**: Contact Stripe Support or check [Stripe Dashboard](https://dashboard.stripe.com/)
- **Supabase**: Check [Supabase Docs](https://supabase.com/docs) or community support
- **Application**: Check application logs and error messages

---

## Next Steps

1. ✅ Complete this setup guide
2. Test thoroughly in test mode
3. Set up monitoring and alerts for failed payments
4. Customize email notifications for subscription events
5. Add analytics tracking for subscription conversions
6. Configure tax collection if required (Stripe Tax)
