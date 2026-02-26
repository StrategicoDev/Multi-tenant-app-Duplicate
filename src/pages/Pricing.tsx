import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPricingPlans } from '../config/pricing';
import { PricingPlan } from '../types/subscription';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user, tenant, signOut } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const plans = getAllPricingPlans();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ No session:', sessionError);
        throw new Error('No active session');
      }

      console.log('📞 Calling create-checkout with:', { 
        priceId: plan.stripePriceId, 
        tier: plan.id,
        hasSession: !!session,
        hasAccessToken: !!session.access_token,
      });

      // Call Supabase edge function to create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: plan.stripePriceId,
          tier: plan.id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('📨 Response:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        
        // Try to get error details from response
        if (error.context && error.context.json) {
          try {
            const errorData = await error.context.json();
            console.error('📋 Error details:', errorData);
            alert(`Checkout failed: ${errorData.error || 'Unknown error'}\n\nDetails: ${errorData.details || 'No details available'}`);
          } catch (e) {
            console.error('Could not parse error response');
            alert('Failed to start checkout. Please try again.');
          }
        } else {
          alert('Failed to start checkout. Please try again.');
        }
        throw error;
      }

      if (data?.url) {
        console.log('✅ Redirecting to checkout:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
              >
                {tenant?.name || 'Multi-Tenant App'}
              </button>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">{user.email}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                      ${plan.price}
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
    </div>
  );
};

export default Pricing;
