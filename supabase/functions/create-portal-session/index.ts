import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "npm:stripe@^17.2.0"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

/**
 * Deschide Stripe Customer Portal pentru userul autentificat, ca să-și poată
 * gestiona singur abonamentul (schimbare plan, metodă de plată, anulare) —
 * fără să reimplementăm noi tot ce oferă deja Stripe.
 *
 * IMPORTANT: Customer Portal-ul trebuie activat o dată, manual, din
 * dashboard-ul Stripe (Settings → Billing → Customer portal). Până atunci,
 * apelul de mai jos întoarce `portal_not_configured`.
 */

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2025-03-31.basil' as any,
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string

// Unde revine userul din portal.
const RETURN_URL = 'https://beatsly.vercel.app/account'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.slice('Bearer '.length)
  )
  if (authError || !user) {
    return json({ error: 'Sesiune invalida sau expirata' }, 401)
  }

  // RLS (`profiles_select_own`) permite userului să-și citească propriul
  // rând — nu e nevoie de service_role pentru asta.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('create-portal-session: profile lookup failed', profileError)
    return json({ error: 'Could not load profile' }, 500)
  }

  if (!profile?.stripe_customer_id) {
    return json(
      { error: 'no_subscription', message: 'No active subscription found for this account.' },
      404
    )
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: RETURN_URL,
    })
    return json({ url: portalSession.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('create-portal-session: stripe error', message)

    // Stripe întoarce un mesaj distinct când Customer Portal-ul nu a fost
    // niciodată configurat din dashboard. Îl detectăm ca să afișăm ceva
    // util în loc de "a eșuat", fără să presupunem alte cauze.
    if (message.toLowerCase().includes('configuration')) {
      return json(
        {
          error: 'portal_not_configured',
          message: 'Customer Portal is not configured yet in Stripe. Enable it in Stripe Dashboard → Settings → Billing → Customer portal.',
        },
        503
      )
    }

    return json({ error: 'Could not open subscription management' }, 502)
  }
})
