-- Update handle_new_user trigger to mark invitations as accepted
-- This ensures invitations are marked as accepted when the user's profile is created

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  existing_tenant_id UUID;
  existing_tenant_count INTEGER;
  is_email_verified BOOLEAN;
  user_role TEXT;
  invited_tenant_id UUID;
  invited_role TEXT;
  invitation_id_to_update UUID;
BEGIN
  -- Check if email was just verified (changed from NULL to a timestamp)
  -- On INSERT: OLD is NULL, so check if NEW has email_confirmed_at set
  -- On UPDATE: Check if email_confirmed_at changed from NULL to NOT NULL
  IF TG_OP = 'INSERT' THEN
    is_email_verified := (NEW.email_confirmed_at IS NOT NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    is_email_verified := (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL);
  ELSE
    is_email_verified := FALSE;
  END IF;

  -- Only proceed if email is verified (or confirmations are disabled)
  -- If email_confirmed_at is set on INSERT, it means confirmations are disabled
  IF NOT is_email_verified THEN
    RETURN NEW;
  END IF;

  -- Check if user already has a profile (prevents duplicate creation on updates)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Check if user was invited
  SELECT id, tenant_id, role INTO invitation_id_to_update, invited_tenant_id, invited_role
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If user was invited, add them to the invited tenant
  IF invited_tenant_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, tenant_id, email, role)
    VALUES (
      NEW.id,
      invited_tenant_id,
      NEW.email,
      invited_role
    );
    
    -- Mark invitation as accepted
    UPDATE public.invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = invitation_id_to_update;
    
    RETURN NEW;
  END IF;

  -- Not invited: use existing tenant flow
  -- Check if any tenant already exists
  SELECT COUNT(*) INTO existing_tenant_count FROM public.tenants;
  
  -- If a tenant exists, get its ID
  IF existing_tenant_count > 0 THEN
    SELECT id INTO existing_tenant_id FROM public.tenants LIMIT 1;
  END IF;
  
  -- Get the role from user metadata (set during signup)
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');
  
  IF existing_tenant_count > 0 THEN
    -- Tenant exists: Add user to existing tenant with their selected role
    -- Only allow admin or member roles (not owner)
    IF user_role = 'owner' THEN
      user_role := 'member'; -- Prevent additional owners
    END IF;
    
    -- Create user profile with selected role in existing tenant
    INSERT INTO public.profiles (id, tenant_id, email, role)
    VALUES (
      NEW.id,
      existing_tenant_id,
      NEW.email,
      user_role
    );
  ELSE
    -- No tenant exists: Create new tenant and make user owner
    INSERT INTO public.tenants (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'tenant_name', CONCAT(NEW.email, '''s Organization')))
    RETURNING id INTO new_tenant_id;

    -- Create user profile as owner
    INSERT INTO public.profiles (id, tenant_id, email, role)
    VALUES (
      NEW.id,
      new_tenant_id,
      NEW.email,
      'owner'  -- First verified user is always owner
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
