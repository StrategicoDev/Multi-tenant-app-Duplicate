# Multi-Tenant Subscription Model

## How User Subscriptions Work

### 📋 Overview

Your app uses a **tenant-based subscription model**, which means:
- ✅ **One subscription per organization (tenant)**, not per user
- ✅ All users in an organization share the same subscription
- ✅ Only the owner can upgrade/downgrade the subscription
- ✅ Invited users automatically join under the existing subscription tier

---

## Subscription Flow

### 1️⃣ **Owner Creates Organization**

When a new user registers as an owner:

```sql
-- Creates tenant
INSERT INTO tenants (name, owner_id) VALUES ('Company Name', owner_user_id)

-- Creates owner profile
INSERT INTO profiles (id, tenant_id, email, role) 
VALUES (owner_user_id, tenant_id, 'owner@company.com', 'owner')

-- Creates FREE TRIAL subscription (14 days)
INSERT INTO subscriptions (user_id, tenant_id, tier, status)
VALUES (owner_user_id, tenant_id, 'free', 'trialing')
```

**Result:**
- Organization starts with **Free Trial** (14 days)
- Tier: `free`
- Status: `trialing`

---

### 2️⃣ **Owner Invites Users**

Owner can invite users to join the organization:

**In Dashboard:**
- Go to "User Management"
- Click "Invite User"
- Enter email and select role (admin or member)
- Invitation email sent

---

### 3️⃣ **Invited User Accepts Invitation**

When invited user accepts:

```sql
-- User is added to EXISTING tenant (no new tenant created)
INSERT INTO profiles (id, tenant_id, email, role)
VALUES (invited_user_id, existing_tenant_id, 'member@company.com', 'member')

-- NO new subscription created!
-- User joins the tenant's existing subscription
```

**Result:**
- User joins organization under **existing subscription**
- If org is on Free tier → user has Free access
- If org is on Standard tier → user has Standard access
- User does NOT create their own subscription

---

### 4️⃣ **Owner Upgrades Subscription**

When owner upgrades to a paid plan:

**Via Pricing Page:**
- Owner selects a plan (Starter $5, Standard $10, Premium $25)
- Completes Stripe checkout
- Webhook updates subscription

```sql
-- Updates the tenant's subscription
UPDATE subscriptions
SET 
  tier = 'standard',      -- Upgraded tier
  status = 'active',      -- Now active
  stripe_subscription_id = 'sub_xxx'
WHERE tenant_id = tenant_id
```

**Result:**
- **ALL users** in the organization now have access to Standard features
- Subscription applies to entire organization
- User limits expand based on tier:
  - Free: 3 users
  - Starter: 10 users
  - Standard: 25 users
  - Premium: Unlimited users

---

## Subscription Table Structure

```sql
subscriptions {
  id: UUID
  user_id: UUID              -- Owner who created the subscription
  tenant_id: UUID            -- Organization (ONE per tenant)
  tier: TEXT                 -- 'free', 'starter', 'standard', 'premium'
  status: TEXT               -- 'trialing', 'active', 'canceled', 'past_due'
  stripe_customer_id: TEXT   -- Stripe customer
  stripe_subscription_id: TEXT -- Stripe subscription
  current_period_end: DATE   -- When trial/subscription ends
}
```

**Key Points:**
- ✅ One row per tenant (organization)
- ✅ NOT one row per user
- ✅ All users in tenant_id share this subscription

---

## User Profiles vs Subscriptions

### Profiles Table (Many users per tenant)
```sql
profiles {
  id: UUID           -- User ID
  tenant_id: UUID    -- Which organization they belong to
  email: TEXT        -- User email
  role: TEXT         -- 'owner', 'admin', 'member'
}
```

### Subscriptions Table (One per tenant)
```sql
subscriptions {
  tenant_id: UUID    -- One subscription for entire organization
  tier: TEXT         -- Applies to all users in this tenant
  status: TEXT       -- Applies to all users in this tenant
}
```

---

## Example Scenario

**Company ABC** registers:
1. **Owner** (owner@abc.com) signs up
   - Tenant "Company ABC" created
   - Subscription: Free Trial (14 days)
   - Users: 1 (owner)

2. **Owner invites 2 team members**
   - member1@abc.com (role: member)
   - admin1@abc.com (role: admin)
   - Subscription: Still Free Trial
   - Users: 3 (within Free tier limit)

3. **Owner upgrades to Standard ($10/month)**
   - Subscription: Standard, Active
   - Users: 3 (all get Standard features)
   - Can now add up to 25 users total

4. **Owner invites 5 more users**
   - All 5 join under Standard subscription
   - No extra charge per user (flat $10/month)
   - Users: 8 (within Standard tier limit of 25)

---

## Key Benefits

✅ **Simple Billing**: One subscription per organization  
✅ **Automatic Access**: New users inherit organization's tier  
✅ **No Per-User Charges**: Flat monthly rate per tier  
✅ **Clear Limits**: Each tier has max users/projects  
✅ **Owner Control**: Only owner can change subscription  

---

## Tier Limits

| Tier | Price | Max Users | Max Projects |
|------|-------|-----------|--------------|
| Free Trial | $0 | 3 | 1 |
| Starter | $5/month | 10 | 5 |
| Standard | $10/month | 25 | Unlimited |
| Premium | $25/month | Unlimited | Unlimited |

---

## Summary

**✅ Your system ALREADY works as you described:**

- When owner creates organization → Free trial subscription created
- When users are invited → They join existing subscription (no new subscription)
- When owner upgrades → All users get upgraded features
- Users share the organization's subscription tier

**No changes needed!** The multi-tenant subscription model is working correctly. 🎉
