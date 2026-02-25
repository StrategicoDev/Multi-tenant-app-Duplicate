-- Fix existing user by creating missing profile and subscription
-- Run this after running fix-email-verification-error.sql

-- First, check what exists for sammyseoloane@gmail.com
DO $$
DECLARE
  user_record RECORD;
  tenant_record RECORD;
  profile_record RECORD;
  subscription_record RECORD;
  new_tenant_id UUID;
BEGIN
  -- Get the user from auth.users
  SELECT * INTO user_record FROM auth.users WHERE email = 'sammyseoloane@gmail.com';
  
  IF user_record.id IS NULL THEN
    RAISE NOTICE 'User not found in auth.users';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found user: % (ID: %)', user_record.email, user_record.id;
  RAISE NOTICE 'User metadata: %', user_record.raw_user_meta_data;
  
  -- Check if profile exists
  SELECT * INTO profile_record FROM public.profiles WHERE id = user_record.id;
  
  IF profile_record.id IS NULL THEN
    RAISE NOTICE 'No profile found - creating one...';
    
    -- Check if tenant exists for this user
    SELECT * INTO tenant_record FROM public.tenants WHERE owner_id = user_record.id;
    
    IF tenant_record.id IS NULL THEN
      -- Create tenant
      INSERT INTO public.tenants (name, owner_id)
      VALUES (
        COALESCE(user_record.raw_user_meta_data->>'tenant_name', 'BOB'),
        user_record.id
      )
      RETURNING id INTO new_tenant_id;
      
      RAISE NOTICE 'Created tenant: %', new_tenant_id;
    ELSE
      new_tenant_id := tenant_record.id;
      RAISE NOTICE 'Using existing tenant: %', new_tenant_id;
    END IF;
    
    -- Create profile
    INSERT INTO public.profiles (id, tenant_id, email, role)
    VALUES (
      user_record.id,
      new_tenant_id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'role', 'owner')
    );
    
    RAISE NOTICE 'Created profile for user';
  ELSE
    RAISE NOTICE 'Profile exists: tenant_id=%, role=%', profile_record.tenant_id, profile_record.role;
    new_tenant_id := profile_record.tenant_id;
  END IF;
  
  -- Check if subscription exists
  SELECT * INTO subscription_record FROM public.subscriptions WHERE tenant_id = new_tenant_id;
  
  IF subscription_record.id IS NULL THEN
    RAISE NOTICE 'No subscription found - creating one...';
    
    -- Create free trial subscription
    INSERT INTO public.subscriptions (
      user_id,
      tenant_id,
      tier,
      status,
      current_period_start,
      current_period_end
    ) VALUES (
      user_record.id,
      new_tenant_id,
      'free',
      'trialing',
      NOW(),
      NOW() + INTERVAL '14 days'
    );
    
    RAISE NOTICE 'Created subscription with 14-day trial';
  ELSE
    RAISE NOTICE 'Subscription exists: tier=%, status=%, expires=%', 
      subscription_record.tier, 
      subscription_record.status, 
      subscription_record.current_period_end;
  END IF;
  
  RAISE NOTICE '===== FIX COMPLETE =====';
  
END $$;

-- Verify the data
SELECT 
  'User Profile' as type,
  p.id as user_id,
  p.email,
  p.role,
  p.tenant_id
FROM public.profiles p
WHERE p.email = 'sammyseoloane@gmail.com';

SELECT 
  'Subscription' as type,
  s.user_id,
  s.tenant_id,
  s.tier,
  s.status,
  s.current_period_end as trial_expires
FROM public.subscriptions s
JOIN public.profiles p ON s.tenant_id = p.tenant_id
WHERE p.email = 'sammyseoloane@gmail.com';

SELECT 'Fix completed successfully!' as status;
