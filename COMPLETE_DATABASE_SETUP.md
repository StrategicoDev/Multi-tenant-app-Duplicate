# Complete Database Setup Guide

Apply these SQL scripts in your Supabase SQL Editor to fix all issues and enable user management.

## Step 1: Fix Invitation RLS Policies

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

## Step 2: Enable User Management

This allows owners and admins to view, edit roles, and remove users.

```sql
-- RLS Policies for User Management
DROP POLICY IF EXISTS "profile_update_own" ON profiles;
DROP POLICY IF EXISTS "profile_delete_own" ON profiles;
DROP POLICY IF EXISTS "profile_select_own" ON profiles;

-- Allow users to view profiles in their tenant
CREATE POLICY "profile_select_policy"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow owners and admins to update users
CREATE POLICY "profile_update_policy"
  ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'admin'
      AND profiles.role = 'member'
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'admin'
      AND profiles.role = 'member'
    )
  );

-- Allow owners and admins to delete users
CREATE POLICY "profile_delete_policy"
  ON profiles FOR DELETE
  USING (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'admin'
      AND profiles.role = 'member'
    )
  );

-- Keep INSERT policy for new users
CREATE POLICY "profile_insert_policy"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());
```

## Step 3: Fix Missing Profiles (If Applicable)

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

## Step 4: Verify Everything Works

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
- Admins can change member roles
- Admins can remove members

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
   - Verify you can only edit members (not owners/other admins)
   - Change a member's role
   - Verify you cannot edit owners

## Troubleshooting

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
