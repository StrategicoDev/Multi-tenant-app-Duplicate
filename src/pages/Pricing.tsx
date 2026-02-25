import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPricingPlans } from '../config/pricing';
import { PricingPlan } from '../types/subscription';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const plans = getAllPricingPlans();

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    if (plan.id === 'free') {
      // Free plan doesn't require payment
      navigate('/dashboard');
      return;
    }

    try {
      setLoading(plan.id);
      
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      // Call Supabase edge function to create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: plan.stripePriceId,
          tier: plan.id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Start FREE with a 14-day trial • No credit card required
          </p>
          <p className="text-base text-gray-500">
            Select the perfect plan for your business needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`
                bg-white rounded-lg shadow-lg overflow-hidden
                transform transition-all duration-300 hover:scale-105
                ${plan.id === 'standard' ? 'ring-2 ring-yellow-400' : ''}
              `}
            >
              {/* Popular Badge */}
              {plan.id === 'standard' && (
                <div className="bg-yellow-400 text-center py-1 text-sm font-semibold text-gray-900">
                  MOST POPULAR
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">{plan.emoji}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      R{plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600 ml-2">/month</span>
                    )}
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loading === plan.id}
                  className={`
                    w-full py-3 px-4 rounded-lg font-semibold
                    transition-colors duration-200
                    ${
                      plan.id === 'standard'
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : plan.id === 'premium'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : plan.id === 'starter'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }
                    ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : plan.id === 'free' ? (
                    'Start Free Trial'
                  ) : (
                    'Subscribe Now'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 text-gray-600">
          <p className="mb-2">All plans include 14-day money-back guarantee</p>
          <p className="text-sm">
            Need a custom enterprise plan?{' '}
            <a href="mailto:sales@example.com" className="text-blue-600 hover:underline">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
