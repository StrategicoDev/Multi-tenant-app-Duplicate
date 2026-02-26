# Update Stripe Prices to Match New USD Pricing

## ⚠️ IMPORTANT: Update Required in Stripe Dashboard

The app pricing has been updated to USD, but you need to create new Stripe Price objects to match:

### New Pricing (USD):
- 🔵 **Starter**: $5/month
- 🟡 **Standard**: $10/month
- 🔴 **Premium**: $25/month

---

## Steps to Update Stripe Prices:

### 1. Create New Prices in Stripe Dashboard

Go to: https://dashboard.stripe.com/test/products

For each tier:

#### **Starter - $5/month**
1. Click on your Starter product (or create new)
2. Click "Add another price"
3. Set:
   - Price: `$5.00`
   - Billing period: `Monthly`
   - Payment type: `Recurring`
4. Click "Save"
5. Copy the new Price ID (starts with `price_`)

#### **Standard - $10/month**
1. Click on your Standard product (or create new)
2. Click "Add another price"
3. Set:
   - Price: `$10.00`
   - Billing period: `Monthly`
   - Payment type: `Recurring`
4. Click "Save"
5. Copy the new Price ID (starts with `price_`)

#### **Premium - $25/month**
1. Click on your Premium product (or create new)
2. Click "Add another price"
3. Set:
   - Price: `$25.00`
   - Billing period: `Monthly`
   - Payment type: `Recurring`
4. Click "Save"
5. Copy the new Price ID (starts with `price_`)

---

### 2. Update Environment Variables

Update your `.env` file with the new Stripe Price IDs:

```env
# Stripe Test Price IDs (USD)
VITE_STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxx    # $5/month
VITE_STRIPE_STANDARD_PRICE_ID=price_xxxxxxxxxxxxx   # $10/month
VITE_STRIPE_PREMIUM_PRICE_ID=price_xxxxxxxxxxxxx    # $25/month
```

---

### 3. Restart Development Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

### 4. Test the New Pricing

1. Go to `/pricing` in your app
2. Verify prices show:
   - Starter: $5/month
   - Standard: $10/month
   - Premium: $25/month
3. Try a test checkout with card: `4242 4242 4242 4242`
4. Verify Stripe checkout shows correct amount

---

## Alternative: Use Stripe CLI to Create Prices

```bash
# Starter - $5/month
stripe prices create \
  --product=prod_XXXXXXX \
  --unit-amount=500 \
  --currency=usd \
  --recurring[interval]=month

# Standard - $10/month
stripe prices create \
  --product=prod_XXXXXXX \
  --unit-amount=1000 \
  --currency=usd \
  --recurring[interval]=month

# Premium - $25/month
stripe prices create \
  --product=prod_XXXXXXX \
  --unit-amount=2500 \
  --currency=usd \
  --recurring[interval]=month
```

Replace `prod_XXXXXXX` with your actual Product IDs from Stripe Dashboard.

---

## What Was Changed in the App:

✅ **pricing.ts** - Currency changed from ZAR to USD, prices updated
✅ **Pricing.tsx** - Display changed from `R` to `$` symbol  
✅ **SubscriptionManagement.tsx** - Display changed from `R` to `$` symbol

---

## Current Stripe Configuration:

Check your current Stripe Price IDs:
- Go to: https://dashboard.stripe.com/test/products
- Verify each product has the correct USD prices
- Old ZAR prices can be archived (not deleted)

---

## Production Deployment:

When ready for production:

1. Create the same prices in **Live Mode**:
   - https://dashboard.stripe.com/products

2. Update production environment variables with live Price IDs

3. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to live mode keys

4. Configure live webhook endpoint in Stripe Dashboard
