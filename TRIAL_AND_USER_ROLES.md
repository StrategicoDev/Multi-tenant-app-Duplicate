# Trial Period & User Role Configuration

## Overview
This document describes the trial period and user role setup for new tenant registrations.

## Trial Period

### Duration
- **14 days** from the date of registration
- Automatically set when a new tenant is created
- Trial status: `trialing`
- Free tier during trial

### Implementation
When a new tenant is created, the `initialize_free_subscription` trigger automatically:
1. Creates a subscription record with `status = 'trialing'`
2. Sets `tier = 'free'`
3. Sets `current_period_start = NOW()`
4. Sets `current_period_end = NOW() + INTERVAL '14 days'`

### Trial Expiration
After 14 days:
- The trial period ends
- Users must upgrade to a paid plan to continue
- System displays days remaining in the subscription dashboard
- Warning messages appear as trial end approaches

## First User Role

### Owner Role Assignment
The **first user to register** for a new tenant is **automatically assigned the Owner role**.

### Registration Flow
1. User visits `/register` page
2. Provides email, password, and organization name
3. System checks if email domain already has an organization
4. If no existing organization:
   - User is created with `role = 'owner'`
   - New tenant is created with the provided organization name
   - Owner is associated with the tenant
   - Free 14-day trial subscription is initialized

### Owner Privileges
The Owner has full control over:
- All organization settings
- User management (invite, remove, change roles)
- Billing and subscription management
- All tenant data and resources

### Code References
- **Registration**: `src/pages/Register.tsx` (line 80)
- **Auth Context**: `src/contexts/AuthContext.tsx` (signUp function)
- **Database Trigger**: `subscription-setup.sql` (initialize_free_subscription function)

## Subscription Display

The subscription management component shows:
- Current tier and status
- Trial period end date
- Days remaining in trial (real-time calculation)
- Upgrade options
- Billing management (for paid subscriptions)

Location: `src/components/SubscriptionManagement.tsx`

## Testing

### Test New Registration
1. Register with a new email domain
2. Verify user role is 'owner'
3. Check subscription status is 'trialing'
4. Confirm trial end date is 14 days from registration
5. Verify days remaining counter in dashboard

### Test Trial Expiration
1. Manually update `current_period_end` to past date
2. Verify expiration warning appears
3. Confirm upgrade prompts are displayed
4. Test that users can upgrade to paid plans

## Database Schema

```sql
-- Subscriptions table includes:
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID,
  tenant_id UUID,
  tier TEXT DEFAULT 'free',
  status TEXT DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  ...
)
```

## Future Enhancements

- Email notifications at 7 days, 3 days, and 1 day before trial expiration
- Automatic downgrade or suspension after trial expires
- Grace period after trial end
- Option to extend trial for specific users
- Analytics on trial conversion rates
