import { PricingPlan, PricingTier } from '../types/subscription';

export const PRICING_PLANS: Record<PricingTier, PricingPlan> = {
  free: {
    id: 'free',
    name: 'Free (Trial)',
    price: 0,
    currency: 'USD',
    interval: 'month',
    color: 'green',
    emoji: '🟢',
    features: [
      'Up to 3 users',
      'Basic features',
      '1 project',
      'Email support',
      '14-day trial'
    ],
    maxUsers: 3,
    maxProjects: 1
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 5,
    currency: 'USD',
    interval: 'month',
    color: 'blue',
    emoji: '🔵',
    features: [
      'Up to 5 users',
      'All basic features',
      '5 projects',
      'Priority email support',
      'Advanced analytics'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID,
    maxUsers: 5,
    maxProjects: 5
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 10,
    currency: 'USD',
    interval: 'month',
    color: 'yellow',
    emoji: '🟡',
    features: [
      'Up to 15 users',
      'All starter features',
      'Unlimited projects',
      'Priority support',
      'Custom integrations',
      'Advanced reporting'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_STANDARD_PRICE_ID,
    maxUsers: 15,
    maxProjects: -1 // unlimited
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 25,
    currency: 'USD',
    interval: 'month',
    color: 'purple',
    emoji: '🟣',
    features: [
      'Up to 50 users',
      'All standard features',
      'Unlimited projects',
      'Priority phone & email support',
      'Advanced security features',
      'Custom integrations',
      'Dedicated account manager'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_BUSINESS_PRICE_ID,
    maxUsers: 50,
    maxProjects: -1 // unlimited
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 50,
    currency: 'USD',
    interval: 'month',
    color: 'red',
    emoji: '🔴',
    features: [
      'Unlimited users',
      'All business features',
      'Unlimited projects',
      '24/7 phone & email support',
      'Dedicated account manager',
      'Custom development',
      'SLA guarantee',
      'Advanced security & compliance',
      'White-label options'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID,
    maxUsers: -1, // unlimited
    maxProjects: -1 // unlimited
  }
};

export const getPricingPlan = (tier: PricingTier): PricingPlan => {
  return PRICING_PLANS[tier];
};

export const getAllPricingPlans = (): PricingPlan[] => {
  return Object.values(PRICING_PLANS);
};
