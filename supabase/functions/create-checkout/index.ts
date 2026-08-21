import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "npm:stripe@^17.2.0"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2025-03-31.basil' as any,
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Prețurile trăiesc DOAR pe server. Clientul trimite ce vrea să cumpere,
// niciodată cât costă.
const CREDIT_PRICES: Record<number, number> = {
  10: 299,
  25: 599,
  50: 999,
  150: 2499,
  300: 3999,
}

const SUBSCRIPTION_PRICES: Record<string, number> = {
  producer: 1499,
  ultimate: 2999,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- Autentificare -------------------------------------------------
    // `user_id` NU se mai ia din body. Se derivă din JWT-ul apelantului,
    // altfel oricine putea crea sesiuni de checkout în numele altui cont.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // `getUser()` fără argument citește sesiunea din storage-ul clientului,
    // care într-un edge function e gol — deci returnează 401 chiar și cu un
    // header Authorization valid. Tokenul se dă explicit.
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.slice('Bearer '.length)
    )
    if (authError || !user) {
      return json({ error: 'Sesiune invalida sau expirata' }, 401)
    }

    // --- Validarea produsului -------------------------------------------
    const { amount, item_type } = await req.json()

    let price: number
    let name: string
    let mode: 'payment' | 'subscription'

    if (item_type === 'credits') {
      const credits = Number(amount)
      price = CREDIT_PRICES[credits]
      if (!price) return json({ error: 'Invalid credit amount' }, 400)
      name = `${credits} Credits Pack`
      mode = 'payment'
    } else if (item_type === 'subscription') {
      const tier = String(amount).toLowerCase()
      price = SUBSCRIPTION_PRICES[tier]
      if (!price) return json({ error: 'Invalid tier' }, 400)
      name = `${tier.toUpperCase()} Subscription`
      mode = 'subscription'
    } else {
      return json({ error: 'Invalid item_type' }, 400)
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name, tax_code: 'txcd_10000000' },
            unit_amount: price,
            // Stripe respinge un Checkout Session `mode: 'subscription'` dacă
            // linia de preț nu are `recurring` — fără asta, apăsarea unui
            // buton de abonament ar fi picat direct cu eroare de la Stripe.
            // Pentru `mode: 'payment'` (credite), `recurring` trebuie omis.
            ...(mode === 'subscription' ? { recurring: { interval: 'month' as const } } : {}),
          },
          quantity: 1,
        },
      ],
      mode,
      success_url: 'https://beatsly.vercel.app/account?checkout=success',
      cancel_url: 'https://beatsly.vercel.app/pricing',
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: {
        type: item_type,
        amount: String(amount),
        user_id: user.id,
      },
    })

    return json({ url: session.url })
  } catch (error) {
    console.error('create-checkout failed:', error)
    // Nu returnăm mesajul intern al erorii către client.
    return json({ error: 'Could not create checkout session' }, 400)
  }
})
