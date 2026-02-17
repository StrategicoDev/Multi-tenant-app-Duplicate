-- Fix infinite recursion in RLS policies
-- Create a security definer function to get current user's tenant_id without triggering RLS

-- Drop existing problematic policies
DROP POLICY IF EXISTS "profile_select_policy" ON profiles;
DROP POLICY IF EXISTS "profile_update_policy" ON profiles;
DROP POLICY IF EXISTS "profile_delete_policy" ON profiles;
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

-- Verify the policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
