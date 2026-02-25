import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    console.log(`🔔 Webhook received: ${event.type}`)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('💳 Checkout session completed:', session.id)

        // Get metadata from session
        const tenantId = session.metadata?.tenant_id
        const tier = session.metadata?.tier

        if (!tenantId || !tier) {
          console.error('Missing tenant_id or tier in session metadata')
          break
        }

        // Get subscription details
        const subscriptionData = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        // Update subscription in database
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            tier: tier,
            status: 'active',
            stripe_subscription_id: subscriptionData.id,
            current_period_start: new Date((subscriptionData as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((subscriptionData as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: false,
          })
          .eq('tenant_id', tenantId)

        if (error) {
          console.error('Error updating subscription:', error)
        } else {
          console.log('✅ Subscription updated successfully')
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('🔄 Subscription updated:', subscription.id)

        // Find the subscription by stripe_subscription_id
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (!existingSubscription) {
          console.error('Subscription not found in database')
          break
        }

        // Update subscription status
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status === 'active' ? 'active' : 
                    subscription.status === 'past_due' ? 'past_due' :
                    subscription.status === 'canceled' ? 'canceled' : 'active',
            current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: (subscription as any).cancel_at_period_end || false,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating subscription:', error)
        } else {
          console.log('✅ Subscription status updated')
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('❌ Subscription deleted:', subscription.id)

        // Update subscription to canceled
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            tier: 'free',
            cancel_at_period_end: false,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error canceling subscription:', error)
        } else {
          console.log('✅ Subscription canceled successfully')
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('⚠️ Payment failed for invoice:', invoice.id)

        const subscriptionId = (invoice as any).subscription
        if (subscriptionId) {
          // Mark subscription as past_due
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'past_due',
            })
            .eq('stripe_subscription_id', subscriptionId as string)

          if (error) {
            console.error('Error updating subscription to past_due:', error)
          } else {
            console.log('✅ Subscription marked as past_due')
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('✅ Payment succeeded for invoice:', invoice.id)

        const subscriptionId = (invoice as any).subscription
        if (subscriptionId) {
          // Ensure subscription is marked as active
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'active',
            })
            .eq('stripe_subscription_id', subscriptionId as string)

          if (error) {
            console.error('Error updating subscription to active:', error)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
