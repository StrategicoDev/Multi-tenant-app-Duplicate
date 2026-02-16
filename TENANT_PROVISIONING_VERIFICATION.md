# Tenant Provisioning Verification

## ✅ Verification Results

This document verifies that the application correctly implements the single-tenant provisioning requirements.

## Requirements

### 1. First Verified User Creates Tenant and Becomes Owner ✅

**Implementation:**
- Database trigger: `handle_new_user()` in [supabase-setup.sql](supabase-setup.sql)
- Trigger type: `AFTER INSERT OR UPDATE ON auth.users`
- Verification check: Only creates tenant when `email_confirmed_at` changes from NULL to a timestamp

**Flow:**

#### When Email Confirmation is ENABLED:
1. User signs up → Account created in `auth.users` (email_confirmed_at = NULL)
2. User receives verification email
3. User clicks verification link → `email_confirmed_at` gets set
4. Trigger detects email verification → Creates tenant and profile with role='owner'

#### When Email Confirmation is DISABLED (Development):
1. User signs up → Account created with `email_confirmed_at` already set
2. Trigger immediately detects verified email → Creates tenant and profile with role='owner'

**Code Location:** [supabase-setup.sql](supabase-setup.sql#L97-L161)

```sql
-- Only proceed if email is verified
IF NOT is_email_verified THEN
  RETURN NEW;
END IF;

-- Create tenant and assign owner role
INSERT INTO public.tenants (name)
VALUES (COALESCE(NEW.raw_user_meta_data->>'tenant_name', ...))
RETURNING id INTO new_tenant_id;

INSERT INTO public.profiles (id, tenant_id, email, role)
VALUES (NEW.id, new_tenant_id, NEW.email, 'owner');
```

### 2. Everyone Else is Blocked from Creating a Second Tenant ✅

**Implementation:**
- Single-tenant enforcement in `handle_new_user()` function
- Checks tenant count BEFORE creating tenant
- Raises exception if tenant already exists

**Code Location:** [supabase-setup.sql](supabase-setup.sql#L129-L135)

```sql
-- Check if any tenant already exists (single-tenant enforcement)
SELECT COUNT(*) INTO existing_tenant_count FROM public.tenants;

IF existing_tenant_count > 0 THEN
  RAISE EXCEPTION 'Tenant already exists. New signups are not allowed. 
    Please contact the organization owner for an invite.'
    USING HINT = 'Only the first verified user can create a tenant.';
END IF;
```

**User Experience:**
- Second user signs up → Can create account
- Second user verifies email → Gets error message
- Error is caught in [Register.tsx](src/pages/Register.tsx#L57-L58)
- User sees: "This system already has an organization. New signups are not allowed. Please contact your organization owner for access."

### 3. Row Level Security Enforcement ✅

**Tenant Table Policies:**
- SELECT: Users can only view their own tenant
- INSERT: Only via trigger (users can't manually insert)
- UPDATE: Only owners can update
- DELETE: Only owners can delete

**Profile Table Policies:**
- SELECT: Users can only view their own profile
- INSERT: Only via trigger during signup
- UPDATE: Users can update their own profile
- DELETE: Users can delete their own profile

**Code Location:** [supabase-setup.sql](supabase-setup.sql#L31-L91)

## Critical Fix Applied

### Bug Fixed: Tenant Created Before Email Verification ❌ → ✅

**Previous Issue:**
- Trigger ran on `AFTER INSERT` only
- Tenant was created immediately on signup (before verification)
- Unverified user could lock the system

**Solution Applied:**
- Changed trigger to `AFTER INSERT OR UPDATE`
- Added email verification check (`email_confirmed_at`)
- Tenant only created when email is verified
- Prevents unverified users from blocking the system

## Testing Scenarios

### Scenario 1: First User (Email Confirmation Enabled)
```
1. User A signs up → ✅ Account created, no tenant yet
2. User A verifies email → ✅ Tenant created, User A is owner
3. User A logs in → ✅ Redirected to Owner Dashboard
```

### Scenario 2: Second User Blocked
```
1. User B signs up → ✅ Account created, no tenant yet
2. User B verifies email → ❌ Error: "Tenant already exists"
3. User B cannot access system → ✅ Correctly blocked
```

### Scenario 3: First User Never Verifies
```
1. User A signs up → ✅ Account created, no tenant yet
2. User A never verifies → ⏳ No tenant created
3. User B signs up and verifies → ✅ User B creates tenant and becomes owner
4. User A later tries to verify → ❌ Error: "Tenant already exists"
```

### Scenario 4: Development (Email Confirmation Disabled)
```
1. User A signs up → ✅ Account created with email_confirmed_at already set
2. Trigger runs immediately → ✅ Tenant created, User A is owner
3. User A can login right away → ✅ No email verification needed
4. User B signs up → ❌ Error during signup: "Tenant already exists"
```

## Security Measures

1. **SECURITY DEFINER**: Function runs with elevated privileges
2. **Row Level Security**: All tables have RLS enabled
3. **Duplicate Prevention**: Checks if profile exists before creation
4. **Single-Tenant Enforcement**: Count check prevents multiple tenants
5. **Email Verification**: Ensures only verified users claim ownership

## Configuration Files

### Production (Hosted Supabase)
- Configure in **Supabase Dashboard** → Authentication → Providers → Email
- Enable "Email confirmations"
- Configure SMTP settings (Mailtrap)

### Development (Local Supabase)
- Configure in [supabase/config.toml](supabase/config.toml)
- Set `enable_confirmations = true` (line 203)
- Optional: Configure SMTP or use Inbucket (localhost:54324)

## Conclusion

✅ **All tenant provisioning requirements are correctly implemented:**
1. ✅ First verified user creates tenant and becomes Owner
2. ✅ Subsequent signups are blocked (single-tenant enforcement)
3. ✅ Row Level Security ensures data isolation
4. ✅ Email verification prevents unverified users from blocking the system
5. ✅ Proper error handling and user feedback

The system is secure and follows the single-tenant model as specified.
