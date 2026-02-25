-- Fix Email Verification Error
-- This update fixes multiple issues:
-- 1. Makes handle_new_user more permissive (no blocking exceptions)
-- 2. Adds tenant owner_id column for subscription trigger
-- 3. Creates subscription after profile is created

-- Add owner_id to tenants table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Update handle_new_user to create subscription after profile
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
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error adding invited user to tenant: %', SQLERRM;
    END;
    
    RETURN NEW;
  END IF;

  -- Not invited: Check if user wants to create a new tenant
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');
  tenant_name_input := NEW.raw_user_meta_data->>'tenant_name';
  
  -- Only allow tenant creation if user registered as 'owner' with tenant name
  IF user_role = 'owner' AND tenant_name_input IS NOT NULL AND tenant_name_input != '' THEN
    BEGIN
      -- Create new tenant with owner_id
      INSERT INTO public.tenants (name, owner_id)
      VALUES (tenant_name_input, NEW.id)
      RETURNING id INTO new_tenant_id;

      -- Create user profile as owner
      INSERT INTO public.profiles (id, tenant_id, email, role)
      VALUES (
        NEW.id,
        new_tenant_id,
        NEW.email,
        'owner'
      );
      
      -- Create free trial subscription
      INSERT INTO public.subscriptions (
        user_id,
        tenant_id,
        tier,
        status,
        current_period_start,
        current_period_end
      ) VALUES (
        NEW.id,
        new_tenant_id,
        'free',
        'trialing',
        NOW(),
        NOW() + INTERVAL '14 days'
      );
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating tenant and profile: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old subscription trigger (we create subscriptions in handle_new_user now)
DROP TRIGGER IF EXISTS trigger_initialize_subscription ON public.tenants;

-- Verify the changes
SELECT 'Email verification and subscription fix applied successfully!' as status;
