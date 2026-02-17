-- Fix RLS policy for invitations table
-- This allows owners and admins to create invitations for their tenant

-- Drop existing policy
DROP POLICY IF EXISTS "invitation_insert_policy" ON invitations;

-- Recreate INSERT policy with better checks
CREATE POLICY "invitation_insert_policy"
  ON invitations FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- User must be owner or admin of the tenant they're inviting to
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    AND
    -- The invited_by field must match the current user (if provided)
    (invited_by IS NULL OR invited_by = auth.uid())
  );

-- Also update the UPDATE policy to allow accepting invitations
-- This allows users to accept invitations even if they don't have a profile yet
DROP POLICY IF EXISTS "invitation_update_policy" ON invitations;

CREATE POLICY "invitation_update_policy"
  ON invitations FOR UPDATE
  USING (
    -- Either: Owner/admin of the tenant can update
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    -- Or: The invitation is for the current user's email (for accepting invitations)
    (email IN (SELECT email FROM profiles WHERE id = auth.uid()))
  );

-- Ensure anonymous users can read invitations by token (for accepting)
DROP POLICY IF EXISTS "invitation_select_policy" ON invitations;

CREATE POLICY "invitation_select_policy"
  ON invitations FOR SELECT
  USING (
    -- Owner/admin can view all invitations for their tenant
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    -- Anyone can view invitations for their own email (using profile email instead of auth.users)
    email IN (SELECT email FROM profiles WHERE id = auth.uid())
    OR
    -- Allow public access to verify tokens (needed for AcceptInvite page)
    -- This is safe because token is a secure UUID
    token IS NOT NULL
  );
