-- Add domain-based organization check
-- This ensures each email domain can only have one organization/owner
-- Users from the same domain must be invited instead of creating new organizations

-- Function to check if an email domain already has an organization
CREATE OR REPLACE FUNCTION public.check_domain_has_organization(user_email TEXT)
RETURNS TABLE(has_organization BOOLEAN, tenant_name TEXT, owner_email TEXT) AS $$
DECLARE
  email_domain TEXT;
BEGIN
  -- Extract domain from email (everything after @)
  email_domain := LOWER(SUBSTRING(user_email FROM '@(.*)$'));
  
  -- Check if any profile with this domain exists
  RETURN QUERY
  SELECT 
    (COUNT(*) > 0)::BOOLEAN as has_organization,
    (SELECT t.name FROM public.tenants t 
     JOIN public.profiles p ON p.tenant_id = t.id 
     WHERE LOWER(SUBSTRING(p.email FROM '@(.*)$')) = email_domain 
     LIMIT 1) as tenant_name,
    (SELECT p.email FROM public.profiles p 
     WHERE LOWER(SUBSTRING(p.email FROM '@(.*)$')) = email_domain 
     AND p.role = 'owner'
     LIMIT 1) as owner_email
  FROM public.profiles p
  WHERE LOWER(SUBSTRING(p.email FROM '@(.*)$')) = email_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user to enforce domain check
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  is_email_verified BOOLEAN;
  user_role TEXT;
  tenant_name_input TEXT;
  invited_tenant_id UUID;
  invited_role TEXT;
  invitation_id_to_update UUID;
  email_domain TEXT;
  domain_has_org BOOLEAN;
BEGIN
  -- Check if email was just verified
  IF TG_OP = 'INSERT' THEN
    is_email_verified := (NEW.email_confirmed_at IS NOT NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    is_email_verified := (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL);
  ELSE
    is_email_verified := FALSE;
  END IF;

  -- Only proceed if email is verified
  IF NOT is_email_verified THEN
    RETURN NEW;
  END IF;

  -- Check if user already has a profile (prevents duplicate creation)
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
    SET 
      status = 'accepted',
      accepted_at = NOW()
    WHERE id = invitation_id_to_update;
    
    RETURN NEW;
  END IF;

  -- Not invited: Check if user wants to create a new tenant
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');
  tenant_name_input := NEW.raw_user_meta_data->>'tenant_name';
  
  -- Extract email domain
  email_domain := LOWER(SUBSTRING(NEW.email FROM '@(.*)$'));
  
  -- Check if this domain already has an organization
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE LOWER(SUBSTRING(p.email FROM '@(.*)$')) = email_domain
  ) INTO domain_has_org;
  
  -- Only allow tenant creation if:
  -- 1. User registered as 'owner' role
  -- 2. User provided a tenant name
  -- 3. Domain does not already have an organization
  IF user_role = 'owner' AND tenant_name_input IS NOT NULL AND tenant_name_input != '' THEN
    IF domain_has_org THEN
      -- Domain already has an organization - raise error
      RAISE EXCEPTION 'An organization with your email domain already exists. Please contact your organization owner for an invitation.';
    END IF;
    
    -- Create new tenant
    INSERT INTO public.tenants (name)
    VALUES (tenant_name_input)
    RETURNING id INTO new_tenant_id;

    -- Create user profile as owner
    INSERT INTO public.profiles (id, tenant_id, email, role)
    VALUES (
      NEW.id,
      new_tenant_id,
      NEW.email,
      'owner'
    );
  ELSE
    -- User tried to register without invitation and without creating tenant
    RAISE EXCEPTION 'Cannot create user profile: Must either be invited to a tenant or create a new tenant with a tenant name';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the changes
SELECT 'Domain-based organization check enabled successfully!' as status;
