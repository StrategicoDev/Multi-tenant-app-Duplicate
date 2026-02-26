import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
console.log('🔑 Stripe key loaded:', stripeKey ? `${stripeKey.substring(0, 12)}...` : 'MISSING!');

const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Create checkout called')
    console.log('📝 Request headers:', Object.fromEntries(req.headers.entries()))
    
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    console.log('🔑 Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('❌ No Authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }
    
    // Create Supabase client - use anon key with the auth header for proper JWT validation
   const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization")!,
      },
    },
  }
)
    
    // Get the authenticated user
    console.log('🔍 Getting user...')
    console.log('🔍 SUPABASE_URL:', Deno.env.get("SUPABASE_URL") ? 'SET' : 'MISSING')
    console.log('🔍 SUPABASE_ANON_KEY:', Deno.env.get("SUPABASE_ANON_KEY") ? 'SET' : 'MISSING')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('❌ Error getting user:', userError)
      console.error('❌ User error details:', JSON.stringify(userError))
      return new Response(
        JSON.stringify({ 
          code: 401,
          message: 'Invalid JWT',
          error: userError.message,
          details: JSON.stringify(userError)
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    if (!user) {
      console.error('❌ No user found')
      return new Response(
        JSON.stringify({ 
          code: 401,
          message: 'No user found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    console.log('✅ User found:', user.email)
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { priceId, tier } = await req.json()
    console.log('💰 Creating checkout for:', { priceId, tier })

    // Get user's tenant from profile
    console.log('🔍 Querying profile for user:', user.id)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Error querying profile:', profileError)
      throw new Error(`Profile error: ${profileError.message}`)
    }

    if (!userProfile) {
      console.error('❌ No tenant found for user')
      throw new Error('No tenant found for user')
    }

    console.log('✅ Found tenant:', userProfile.tenant_id)

    // Check if customer already exists
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    let customerId = existingSubscription?.stripe_customer_id

    // Create customer if doesn't exist
    if (!customerId) {
      console.log('🆕 Creating new Stripe customer...')
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.id,
            tenant_id: userProfile.tenant_id,
          },
        })
        customerId = customer.id
        console.log('✅ Stripe customer created:', customerId)

        // Update subscription with customer ID
        await supabaseAdmin
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('tenant_id', userProfile.tenant_id)
        
        console.log('✅ Updated subscription with customer ID')
      } catch (stripeError) {
        console.error('❌ Stripe API error:', stripeError)
        throw stripeError
      }
    } else {
      console.log('✅ Using existing Stripe customer:', customerId)
    }

    // Create checkout session
    console.log('🛒 Creating Stripe checkout session...')
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.get('origin')}/dashboard?success=true`,
        cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
        metadata: {
          user_id: user.id,
          tenant_id: userProfile.tenant_id,
          tier: tier,
        },
      })
      
      console.log('✅ Checkout session created:', session.id)

      return new Response(
        JSON.stringify({ url: session.url }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } catch (stripeError) {
      console.error('❌ Stripe checkout error:', stripeError)
      throw stripeError
    }
  } catch (error) {
    console.error('❌ Error creating checkout session:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error('📋 Error details:', errorDetails)
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
