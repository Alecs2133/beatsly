import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "npm:stripe@^17.2.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2025-03-31.basil' as any,
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, item_type, user_id } = await req.json()

    if (!user_id) throw new Error('user_id is required')

    let price = 0
    let name = ""

    if (item_type === 'credits') {
      if (amount === 10) price = 299
      else if (amount === 25) price = 599
      else if (amount === 50) price = 999
      else if (amount === 150) price = 2499
      else if (amount === 300) price = 3999
      else throw new Error('Invalid credit amount')
      name = `${amount} Credits Pack`
    } else if (item_type === 'subscription') {
      if (amount === 'producer') price = 1499
      else if (amount === 'ultimate') price = 2999
      else throw new Error('Invalid tier')
      name = `${amount.toUpperCase()} Subscription`
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name,
              tax_code: 'txcd_10000000'
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: item_type === 'subscription' ? 'subscription' : 'payment',
      success_url: 'https://beatsly.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://beatsly.app/cancel',
      client_reference_id: user_id, // We need this to identify the user in the webhook
      metadata: {
        type: item_type,
        amount: amount.toString()
      }
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
