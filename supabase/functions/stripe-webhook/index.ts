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
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') as string,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error(`Webhook signature verification failed: ${(err as Error).message}`)
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const userId = session.client_reference_id
  const type = session.metadata?.type
  const amount = session.metadata?.amount

  if (!userId) {
    console.error(`Event ${event.id}: missing client_reference_id`)
    // 200 intenționat: fără user_id nu are rost ca Stripe să reîncerce.
    return new Response(JSON.stringify({ received: true, skipped: 'no user' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    if (type === 'credits') {
      const creditAmount = Number.parseInt(amount ?? '', 10)
      if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
        throw new Error(`Invalid credit amount in metadata: ${amount}`)
      }

      // RPC idempotent: `event.id` e cheia. O reîncercare Stripe a aceluiași
      // eveniment returnează false și nu acordă creditele a doua oară.
      const { data: applied, error } = await supabase.rpc('grant_purchased_credits', {
        p_event_id: event.id,
        p_user_id: userId,
        p_amount: creditAmount,
      })
      if (error) throw error

      console.log(
        applied
          ? `Added ${creditAmount} credits to user ${userId}`
          : `Event ${event.id} already processed, skipping`
      )
    } else if (type === 'subscription') {
      // `mode: 'subscription'` garantează că Stripe atașează un Customer
      // sesiunii — spre deosebire de `mode: 'payment'` (credite), unde nu se
      // creează unul automat. Îl salvăm ca userul să poată deschide ulterior
      // Customer Portal-ul ("Manage Subscription").
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null

      const { data: applied, error } = await supabase.rpc('apply_subscription_tier', {
        p_event_id: event.id,
        p_user_id: userId,
        p_tier: amount,
        p_customer_id: customerId,
      })
      if (error) throw error

      console.log(
        applied
          ? `Upgraded user ${userId} to ${amount} tier`
          : `Event ${event.id} already processed, skipping`
      )
    } else {
      console.warn(`Event ${event.id}: unknown metadata.type "${type}"`)
    }
  } catch (err) {
    console.error(`Failed to process event ${event.id}:`, err)
    // 500 => Stripe reîncearcă. Sigur, pentru că acordarea e idempotentă.
    return new Response(
      JSON.stringify({ error: 'Processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
