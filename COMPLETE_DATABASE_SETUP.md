# Complete Database Setup Guide

Apply these SQL scripts in your Supabase SQL Editor to fix all issues and enable user management.

## Step 1: Enable Multi-Tenant Support with Domain Enforcement (IMPORTANT)

**This MUST be applied first!** This enables multi-tenant architecture with domain-based organization grouping.

Go to: https://supabase.com/dashboard/project/soekhmeytdgmbvaardev/sql/new

Copy and run the contents of [fix-multi-tenant-support.sql](fix-multi-tenant-support.sql)

**What this does:**
- Allows multiple independent organizations to be created
- **Enforces one organization per email domain** (e.g., all @company.com users belong to the same organization)
- First user from a domain becomes the owner and creates the organization
- Additional users from the same domain MUST be invited by the owner
- Users from different domains can create their own organizations
- Enables true multi-tenant SaaS architecture with domain-based organization grouping

**Key changes:**
- New users from a new domain can create organizations (become owners)
- Users from existing domains must use invitations to join
- Each domain has one organization with clear ownership
- Complete tenant isolation maintained

**Example:**
- john@company.com registers → Creates "Company Inc." organization, becomes owner
- jane@company.com tries to register → Gets error, must be invited by john@company.com
- bob@different.com registers → Creates "Different Corp." organization, becomes owner

## Step 2: Fix Invitation RLS Policies

This fixes the "permission denied" and RLS violation errors when creating invitations.

Go to: https://supabase.com/dashboard/project/soekhmeytdgmbvaardev/sql/new

```sql
-- Fix RLS policies for invitations
DROP POLICY IF EXISTS "invitation_insert_policy" ON invitations;
DROP POLICY IF EXISTS "invitation_update_policy" ON invitations;
DROP POLICY IF EXISTS "invitation_select_policy" ON invitations;

CREATE POLICY "invitation_insert_policy"
  ON invitations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    AND (invited_by IS NULL OR invited_by = auth.uid())
  );

CREATE POLICY "invitation_update_policy"
  ON invitations FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR (email IN (SELECT email FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "invitation_select_policy"
  ON invitations FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR email IN (SELECT email FROM profiles WHERE id = auth.uid())
    OR token IS NOT NULL
  );
```

## Step 3: Enable User Management

This allows owners and admins to view, edit roles, and remove users.

**IMPORTANT:** This uses helper functions to avoid infinite recursion in RLS policies.

```sql
-- Fix infinite recursion in RLS policies
-- Create helper functions that bypass RLS

-- Drop existing problematic policies
DROP POLICY IF EXISTS "profile_select_policy" ON profiles;
DROP POLICY IF EXISTS "profile_select_own" ON profiles;
DROP POLICY IF EXISTS "profile_update_policy" ON profiles;
DROP POLICY IF EXISTS "profile_update_own" ON profiles;
DROP POLICY IF EXISTS "profile_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profile_delete_own" ON profiles;
DROP POLICY IF EXISTS "profile_insert_policy" ON profiles;

-- Create helper function to get current user's tenant_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create helper function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- SELECT: Users can view their own profile and profiles in their tenant
CREATE POLICY "profile_select_policy"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR
    tenant_id = public.current_user_tenant_id()
  );

-- INSERT: Users can create their own profile
CREATE POLICY "profile_insert_policy"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile, owners and admins can update anyone in their tenant
CREATE POLICY "profile_update_policy"
  ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR
    (public.current_user_role() IN ('owner', 'admin') AND tenant_id = public.current_user_tenant_id())
  )
  WITH CHECK (
    id = auth.uid()
    OR
    (public.current_user_role() IN ('owner', 'admin') AND tenant_id = public.current_user_tenant_id())
  );

-- DELETE: Users can delete their own profile, owners and admins can delete anyone in their tenant
CREATE POLICY "profile_delete_policy"
  ON profiles FOR DELETE
  USING (
    id = auth.uid()
    OR
    (public.current_user_role() IN ('owner', 'admin') AND tenant_id = public.current_user_tenant_id())
  );
```

## Step 4: Fix Missing Profiles (If Applicable)

If you have users who are authenticated but don't have profiles, run this:

```sql
-- Create missing profile for authenticated users
INSERT INTO public.profiles (id, tenant_id, email, role)
SELECT 
  u.id,
  COALESCE(
    (SELECT id FROM public.tenants LIMIT 1),
    (SELECT gen_random_uuid())
  ) as tenant_id,
  u.email,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.tenants) = 0 THEN 'owner'
    ELSE 'member'
  END as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Create tenant if none exists
INSERT INTO public.tenants (name)
SELECT 'Main Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants);

-- Update profiles to link to tenant if needed
UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenants LIMIT 1)
WHERE tenant_id NOT IN (SELECT id FROM public.tenants);
```

## Step 5: Auto-Mark Expired Invitations

This automatically marks invitations as 'expired' when they pass their expiry date, and adds visual indicators in the dashboard.

```sql
-- Automatically mark expired invitations
-- This function checks and updates invitation status from 'pending' to 'expired' when they expire

-- Create function to mark expired invitations
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE public.invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function that runs before SELECT to ensure expired invitations are marked
CREATE OR REPLACE FUNCTION check_invitation_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.expires_at < NOW() THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before insert/update
DROP TRIGGER IF EXISTS invitation_expiry_check ON invitations;
CREATE TRIGGER invitation_expiry_check
  BEFORE INSERT OR UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_invitation_expiry();

-- Run once to update existing expired invitations
SELECT mark_expired_invitations();
```

**What this does:**
- Automatically marks expired invitations with status='expired'
- Shows expired invitations with red background in dashboard
- Expired invitations show "Expired" badge and "Delete" button
- Trigger ensures new/updated invitations are checked for expiry
- Invitations expire after 7 days by default

## Step 6: Verify Everything Works

Run this query to check your setup:

```sql
-- Check users and their roles
SELECT 
  p.email,
  p.role,
  t.name as tenant_name,
  p.created_at
FROM profiles p
JOIN tenants t ON p.tenant_id = t.id
ORDER BY p.created_at DESC;

-- Check invitations
SELECT 
  email,
  role,
  status,
  created_at,
  expires_at
FROM invitations
ORDER BY created_at DESC;

-- Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'invitations')
ORDER BY tablename, policyname;
```

## What This Enables

After applying these changes:

✅ **Invitation System**
- Owners and admins can send invitations
- Invitations create database records
- Email function sends professional emails

✅ **User Management**
- Owners can view all users in their tenant
- Owners can change any user's role (owner/admin/member)
- Owners can remove users from the tenant
- Admins can view all users in their tenant
- Admins can change any user's role (owner/admin/member)
- Admins can remove users from the tenant

✅ **Security**
- All data is tenant-isolated
- Users can only access their own tenant's data
- Role hierarchy is enforced (owner > admin > member)
- Cannot edit your own profile role through the management UI

## Testing Steps

1. **Test Invitations**:
   - Log in as owner
   - Go to Owner Dashboard
   - Send an invitation
   - Check email (or Mailtrap inbox)
   - Accept invitation link
   - Verify new user joins the tenant

2. **Test User Management**:
   - Log in as owner
   - Scroll to "Team Members" section
   - View all users in your tenant
   - Change a member's role to admin
   - Change an admin's role to member
   - Try removing a user

3. **Test Admin Permissions**:
   - Log in as admin
   - Go to Admin Dashboard
   - View "Team Members" section
   - Verify you can edit all users (including owners and other admins)
   - Change any user's role (owner/admin/member)
   - Remove users from the tenant
   - Note: You cannot edit your own role

## Troubleshooting

**Error: "infinite recursion detected in policy for relation 'profiles'"**
- This means the RLS policies were creating circular dependencies
- The old policies queried `profiles` table within the policy for `profiles` table
- Solution: Use the helper functions version in Step 2 (already fixed above)
- The helper functions use `SECURITY DEFINER` to bypass RLS and avoid recursion

**Error: "permission denied for table users"**
- This means Step 1 wasn't applied correctly
- Re-run the invitation RLS policies

**Error: "new row violates row-level security"**
- This means RLS policies aren't allowing the operation
- Verify your user has the correct role in the profiles table

**Users can't see each other**
- Run Step 2 to enable profile viewing within tenant

**Can't change user roles**
- Run Step 2 to enable user management

**Missing users**
- Run Step 3 to create missing profiles
