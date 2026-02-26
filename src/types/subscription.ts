export type PricingTier = 'free' | 'starter' | 'standard' | 'business' | 'premium';

export interface PricingPlan {
  id: PricingTier;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  color: string;
  emoji: string;
  features: string[];
  stripePriceId?: string;
  maxUsers?: number;
  maxProjects?: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  tenant_id: string;
  tier: PricingTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}
