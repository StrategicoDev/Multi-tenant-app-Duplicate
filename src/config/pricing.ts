import { PricingPlan, PricingTier } from '../types/subscription';

export const PRICING_PLANS: Record<PricingTier, PricingPlan> = {
  free: {
    id: 'free',
    name: 'Free (Trial)',
    price: 0,
    currency: 'ZAR',
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
    price: 60,
    currency: 'ZAR',
    interval: 'month',
    color: 'blue',
    emoji: '🔵',
    features: [
      'Up to 10 users',
      'All basic features',
      '5 projects',
      'Priority email support',
      'Advanced analytics'
    ],
    stripePriceId: process.env.VITE_STRIPE_STARTER_PRICE_ID,
    maxUsers: 10,
    maxProjects: 5
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 80,
    currency: 'ZAR',
    interval: 'month',
    color: 'yellow',
    emoji: '🟡',
    features: [
      'Up to 25 users',
      'All starter features',
      'Unlimited projects',
      'Priority support',
      'Custom integrations',
      'Advanced reporting'
    ],
    stripePriceId: process.env.VITE_STRIPE_STANDARD_PRICE_ID,
    maxUsers: 25,
    maxProjects: -1 // unlimited
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 120,
    currency: 'ZAR',
    interval: 'month',
    color: 'red',
    emoji: '🔴',
    features: [
      'Unlimited users',
      'All standard features',
      'Unlimited projects',
      '24/7 phone & email support',
      'Dedicated account manager',
      'Custom development',
      'SLA guarantee',
      'Advanced security features'
    ],
    stripePriceId: process.env.VITE_STRIPE_PREMIUM_PRICE_ID,
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
