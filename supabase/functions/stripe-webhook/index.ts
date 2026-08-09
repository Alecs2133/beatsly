import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "npm:stripe@^17.2.0"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2025-03-31.basil' as any,
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const body = await req.text()
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') as string,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id
    const type = session.metadata?.type
    const amount = session.metadata?.amount

    if (userId) {
      if (type === 'credits') {
        const creditAmount = parseInt(amount)
        // Get current credits
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single()
        
        // Add new credits
        await supabase.from('profiles').update({
          credits: (profile?.credits || 0) + creditAmount
        }).eq('id', userId)
        
        // Add notification
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Credits Added',
          message: `Successfully added ${creditAmount} credits to your account.`,
          type: 'credits'
        })
        
        console.log(`Added ${creditAmount} credits to user ${userId}`)
      } 
      else if (type === 'subscription') {
        await supabase.from('profiles').update({
          tier: amount
        }).eq('id', userId)
        
        // Add notification
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Subscription Upgraded',
          message: `Your account has been upgraded to the ${amount} tier. Welcome!`,
          type: 'system'
        })

        console.log(`Upgraded user ${userId} to ${amount} tier`)
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
