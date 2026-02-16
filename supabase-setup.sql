-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop tables (CASCADE will drop all dependent objects like triggers and policies)
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.check_tenant_exists() CASCADE;

-- Create tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TENANT TABLE POLICIES
-- =====================================================

-- SELECT: Users can view their own tenant
CREATE POLICY "tenant_select_policy"
  ON tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- INSERT: Only allow inserts from authenticated system (via trigger)
CREATE POLICY "tenant_insert_policy"
  ON tenants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only owners can update their tenant
CREATE POLICY "tenant_update_policy"
  ON tenants FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- DELETE: Only owners can delete their tenant
CREATE POLICY "tenant_delete_policy"
  ON tenants FOR DELETE
  USING (
    id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================
-- PROFILE TABLE POLICIES
-- =====================================================

-- SELECT: Users can always view their own profile
CREATE POLICY "profile_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- INSERT: Allow authenticated inserts (via trigger during signup)
CREATE POLICY "profile_insert_policy"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile
CREATE POLICY "profile_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- DELETE: Users can delete their own profile
CREATE POLICY "profile_delete_own"
  ON profiles FOR DELETE
  USING (id = auth.uid());

-- =====================================================
-- PUBLIC FUNCTIONS
-- =====================================================

-- Function to check if a tenant exists (public access, no auth required)
-- This allows the registration page to determine if it's the first user or not
CREATE OR REPLACE FUNCTION public.check_tenant_exists()
RETURNS TABLE(tenant_exists BOOLEAN, tenant_id UUID, tenant_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (COUNT(*) > 0)::BOOLEAN as tenant_exists,
    (SELECT id FROM public.tenants LIMIT 1) as tenant_id,
    (SELECT name FROM public.tenants LIMIT 1) as tenant_name
  FROM public.tenants;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user creation
-- This function creates tenant and profile ONLY when email is verified
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  existing_tenant_id UUID;
  existing_tenant_count INTEGER;
  is_email_verified BOOLEAN;
  user_role TEXT;
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

-- Create triggers for new user signup and email verification
-- Trigger runs on INSERT (for when confirmations are disabled)
-- AND on UPDATE (for when email gets verified)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on tenants
CREATE TRIGGER on_tenant_updated
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updated_at on profiles
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
