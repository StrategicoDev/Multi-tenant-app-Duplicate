# Optimized Pricing Tier Update Guide

## Overview
This guide outlines the steps to implement the new 5-tier pricing structure optimized for faster customer upgrades.

## New Pricing Structure

### Free (Trial)
- **Price**: $0/month
- **Users**: Up to 3
- **Projects**: 1
- **Duration**: 14-day trial
- **Features**: Basic features, Email support

### Starter
- **Price**: $5/month
- **Users**: Up to 5 (reduced from 10)
- **Projects**: 5
- **Features**: All basic features, Priority email support, Advanced analytics
- **Stripe Price ID**: `VITE_STRIPE_STARTER_PRICE_ID`

### Standard
- **Price**: $10/month
- **Users**: Up to 15 (reduced from 25)
- **Projects**: Unlimited
- **Features**: All starter features, Priority support, Custom integrations, Advanced reporting
- **Stripe Price ID**: `VITE_STRIPE_STANDARD_PRICE_ID`

### Business (NEW)
- **Price**: $25/month
- **Users**: Up to 50
- **Projects**: Unlimited
- **Features**: All standard features, Priority phone & email support, Advanced security, Custom integrations, Dedicated account manager
- **Stripe Price ID**: `VITE_STRIPE_BUSINESS_PRICE_ID`

### Premium
- **Price**: $50/month (increased from $25)
- **Users**: Unlimited
- **Projects**: Unlimited
- **Features**: All business features, 24/7 support, Custom development, SLA guarantee, Advanced security & compliance, White-label options
- **Stripe Price ID**: `VITE_STRIPE_PREMIUM_PRICE_ID`

## Implementation Checklist

### ✅ Completed
- [x] Updated TypeScript types to include 'business' tier
- [x] Updated pricing.ts configuration with new tiers
- [x] Updated Pricing.tsx to display 5 tiers
- [x] Adjusted user limits across all tiers
- [x] Created SQL script for database constraint update

### ⏳ Pending

#### 1. Database Update
Run the SQL script in Supabase SQL Editor:
```bash
# File: update-business-tier.sql
```

#### 2. Create Stripe Products

Go to Stripe Dashboard → Products and create/update:

**Business Tier (NEW):**
- Product Name: Business Plan
- Price: $25.00 USD
- Billing Period: Monthly recurring
- Copy the Price ID and add to .env as `VITE_STRIPE_BUSINESS_PRICE_ID`

**Update Premium Tier:**
- Update existing Premium product price from $25 to $50
- Or create new price point: $50.00 USD monthly
- Update .env with new `VITE_STRIPE_PREMIUM_PRICE_ID` if changed

**Verify Starter & Standard:**
- Starter: $5.00 USD monthly
- Standard: $10.00 USD monthly

#### 3. Update Environment Variables

Add to `.env` file:
```env
# Stripe Price IDs
VITE_STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_STANDARD_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_BUSINESS_PRICE_ID=price_xxxxxxxxxxxxx  # NEW
VITE_STRIPE_PREMIUM_PRICE_ID=price_xxxxxxxxxxxxx   # Updated
```

#### 4. Deploy Frontend Changes
```bash
npm run build
# Deploy to your hosting platform
```

#### 5. Testing Checklist

Test the following upgrade paths:
- [ ] Free → Starter (should enforce 5 user limit)
- [ ] Starter → Standard (should enforce 15 user limit)
- [ ] Standard → Business (should enforce 50 user limit)
- [ ] Business → Premium (should allow unlimited users)
- [ ] Verify Stripe checkout creates correct subscriptions
- [ ] Verify webhook updates subscription tier correctly
- [ ] Test user limit enforcement when adding members
- [ ] Verify billing portal shows correct plans

## Rationale for Changes

### User Limit Optimization
- **Starter**: 10 → 5 users
  - Faster upgrade trigger for growing teams
  - Better conversion to Standard tier
  
- **Standard**: 25 → 15 users
  - Creates clear upgrade path to Business
  - Prevents "stuck" customers at mid-tier
  
- **Business**: NEW tier at 50 users
  - Captures scale-ups before they hit Premium
  - $25 price point is attractive for growing companies
  - Provides dedicated support for serious customers
  
- **Premium**: $25 → $50
  - Better reflects value of unlimited users
  - Justifies white-label and custom development
  - Creates significant differentiation from Business

### Revenue Impact
- Faster upgrades = increased ARPU
- 5-tier structure provides more upgrade opportunities
- Business tier captures mid-market segment
- Premium pricing reflects enterprise value

## Migration Notes

### Existing Customers
- Existing subscriptions remain at current tiers/prices (grandfathered)
- New signups get new tier structure
- Consider offering Business tier as upgrade incentive

### Subscription Table
- New `business` tier value must be in database constraint
- Update RLS policies if they reference tier values
- Verify triggers handle all 5 tier values

## Support Resources

### Documentation
- Pricing configuration: `src/config/pricing.ts`
- Pricing page: `src/pages/Pricing.tsx`
- Type definitions: `src/types/subscription.ts`
- Webhook handler: `supabase/functions/stripe-webhook/index.ts`

### Related Files
- `STRIPE_SUBSCRIPTION_SETUP.md` - Original Stripe setup
- `SUBSCRIPTION_MODEL.md` - Multi-tenant subscription model
- `STRIPE_PRICE_UPDATE.md` - Previous USD pricing update

## Next Steps

1. Run `update-business-tier.sql` in Supabase
2. Create/update Stripe products and prices
3. Update `.env` with new price IDs
4. Deploy frontend changes
5. Test all upgrade flows
6. Monitor conversion rates across tiers
