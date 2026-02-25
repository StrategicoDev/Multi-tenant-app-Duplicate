import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types/subscription';
import { PRICING_PLANS } from '../config/pricing';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const SubscriptionManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's tenant from profile
      const { data: userProfile, error: tenantError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (tenantError) throw tenantError;

      // Get subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .single();

      if (error) throw error;

      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!subscription?.stripe_customer_id) return;

    try {
      setActionLoading(true);
      
      // Create billing portal session
      const { data, error } = await supabase.functions.invoke('create-billing-portal', {
        body: {
          customer_id: subscription.stripe_customer_id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">No subscription found.</p>
      </div>
    );
  }

  const currentPlan = PRICING_PLANS[subscription.tier];
  const isActive = subscription.status === 'active';
  const isCanceled = subscription.status === 'canceled';
  const isPastDue = subscription.status === 'past_due';
  const isTrialing = subscription.status === 'trialing';

  // Calculate days remaining in trial
  const trialDaysRemaining = subscription.current_period_end && isTrialing
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`
        px-6 py-4
        ${isActive ? 'bg-green-50' : isPastDue ? 'bg-yellow-50' : 'bg-gray-50'}
      `}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {currentPlan.emoji} {currentPlan.name} Plan
            </h2>
            <p className="text-gray-600 mt-1">
              {currentPlan.price > 0 ? `R${currentPlan.price}/month` : 'Free'}
            </p>
          </div>
          <div>
            <span className={`
              px-3 py-1 rounded-full text-sm font-semibold
              ${isActive ? 'bg-green-200 text-green-800' : ''}
              ${isPastDue ? 'bg-yellow-200 text-yellow-800' : ''}
              ${isCanceled ? 'bg-red-200 text-red-800' : ''}
              ${subscription.status === 'trialing' ? 'bg-blue-200 text-blue-800' : ''}
            `}>
              {subscription.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Details */}
      <div className="px-6 py-4">
        {/* Features */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Features</h3>
          <ul className="space-y-2">
            {currentPlan.features.map((feature, index) => (
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
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Billing Period */}
        {subscription.current_period_end && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {isTrialing ? 'Trial Period' : 'Billing Information'}
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">
                  {isTrialing ? 'Trial ends:' : 'Current period ends:'}
                </span>{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
                {isTrialing && trialDaysRemaining > 0 && (
                  <span className="ml-2 text-blue-600 font-semibold">
                    ({trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} remaining)
                  </span>
                )}
              </p>
              {subscription.cancel_at_period_end && (
                <p className="text-yellow-600 font-medium">
                  ⚠️ Subscription will cancel at period end
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {subscription.tier !== 'premium' && (
            <button
              onClick={handleUpgrade}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Upgrade Plan
            </button>
          )}
          
          {subscription.stripe_customer_id && (
            <button
              onClick={handleManageBilling}
              disabled={actionLoading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Loading...' : 'Manage Billing'}
            </button>
          )}
        </div>

        {/* Alert Messages */}
        {isPastDue && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ Your payment is past due. Please update your payment method to continue using premium features.
            </p>
          </div>
        )}
        
        {subscription.status === 'trialing' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              🎉 You're on a 14-day free trial.{' '}
              {trialDaysRemaining > 0 ? (
                <>
                  You have <strong>{trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}</strong> remaining.{' '}
                  Upgrade to a paid plan to continue after your trial ends.
                </>
              ) : (
                'Your trial has ended. Please upgrade to continue accessing premium features.'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManagement;
