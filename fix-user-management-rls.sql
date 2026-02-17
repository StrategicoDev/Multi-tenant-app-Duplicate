-- RLS Policies for User Management
-- This allows admins and owners to view and manage users in their tenant

-- Update the existing profile policies to allow admins and owners to manage users

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "profile_update_own" ON profiles;

-- Create new UPDATE policy that allows:
-- 1. Users to update their own profile
-- 2. Owners to update any profile in their tenant
-- 3. Admins to update member profiles in their tenant
CREATE POLICY "profile_update_policy"
  ON profiles FOR UPDATE
  USING (
    -- User can update their own profile
    id = auth.uid()
    OR
    -- Owner can update anyone in their tenant
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'owner'
    )
    OR
    -- Admin can update members in their tenant
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'admin'
      AND profiles.role = 'member'
    )
  )
  WITH CHECK (
    -- Same conditions for the updated row
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

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "profile_delete_own" ON profiles;

-- Create new DELETE policy that allows:
-- 1. Users to delete their own profile
-- 2. Owners to delete any profile in their tenant (except their own, handled by app logic)
-- 3. Admins to delete member profiles in their tenant
CREATE POLICY "profile_delete_policy"
  ON profiles FOR DELETE
  USING (
    -- User can delete their own profile
    id = auth.uid()
    OR
    -- Owner can delete anyone in their tenant
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'owner'
    )
    OR
    -- Admin can delete members in their tenant
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'admin'
      AND profiles.role = 'member'
    )
  );

-- Update the SELECT policy to allow admins and owners to view all users in their tenant
DROP POLICY IF EXISTS "profile_select_own" ON profiles;

CREATE POLICY "profile_select_policy"
  ON profiles FOR SELECT
  USING (
    -- User can view their own profile
    id = auth.uid()
    OR
    -- Users can view other profiles in their tenant
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
