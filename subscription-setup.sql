-- =====================================================
-- SUBSCRIPTION SETUP SCRIPT
-- =====================================================
-- This script creates the subscription management system for pricing tiers.
-- 
-- PREREQUISITES:
-- 1. Run supabase-setup.sql first (creates tenants and profiles tables)
-- 2. Run fix-multi-tenant-support.sql (updates tenant handling logic)
-- 
-- This script requires the following tables to exist:
-- - public.tenants (tenant organizations)
-- - public.profiles (user profiles with tenant associations)
-- - auth.users (Supabase auth table)
-- =====================================================

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'standard', 'premium')) DEFAULT 'free',
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')) DEFAULT 'trialing',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id),
  UNIQUE(stripe_subscription_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their tenant's subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Tenant owners can update their subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Tenant owners can insert subscription" ON public.subscriptions;

-- RLS Policies
-- Users can view their tenant's subscription
CREATE POLICY "Users can view their tenant's subscription"
  ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = subscriptions.tenant_id
    )
  );

-- Only tenant owners can update subscription
CREATE POLICY "Tenant owners can update their subscription"
  ON public.subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = subscriptions.tenant_id
      AND profiles.role = 'owner'
    )
  );

-- Only tenant owners can insert subscription (typically during tenant creation)
CREATE POLICY "Tenant owners can insert subscription"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = subscriptions.tenant_id
      AND profiles.role = 'owner'
    )
  );

-- Allow service role to manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Create function to initialize free subscription for new tenants
CREATE OR REPLACE FUNCTION initialize_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id, 
    tenant_id, 
    tier, 
    status, 
    current_period_start, 
    current_period_end
  )
  VALUES (
    NEW.user_id, 
    NEW.id, 
    'free', 
    'trialing',
    NOW(),
    NOW() + INTERVAL '14 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create free subscription when tenant is created
DROP TRIGGER IF EXISTS trigger_initialize_subscription ON public.tenants;
CREATE TRIGGER trigger_initialize_subscription
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION initialize_free_subscription();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
