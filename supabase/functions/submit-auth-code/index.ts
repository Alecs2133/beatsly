import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

/**
 * Primește sesiunea unui login făcut pe site și o pune deoparte, sub un cod
 * temporar generat de aplicația desktop — vezi migrarea
 * `20260907130000_app_auth_handoff.sql` pentru fluxul complet.
 *
 * Cine apelează trebuie să fie chiar userul autentificat (Authorization
 * header valid) — codul nu autorizează pe nimeni, doar leagă o sesiune deja
 * reală de un cod pe care aplicația îl așteaptă.
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// 256 biți de entropie, hex — generat client-side prin crypto.getRandomValues.
const CODE_RE = /^[0-9a-f]{64}$/

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401)
  }
  const accessToken = authHeader.slice('Bearer '.length)

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !user) {
    return json({ error: 'Sesiune invalida sau expirata' }, 401)
  }

  let code: string
  let refreshToken: string
  try {
    const body = await req.json()
    code = String(body?.code ?? '')
    refreshToken = String(body?.refresh_token ?? '')
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!CODE_RE.test(code)) {
    return json({ error: 'Invalid code' }, 400)
  }
  if (!refreshToken) {
    return json({ error: 'Missing refresh_token' }, 400)
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey)

  // `insert`, nu `upsert`: un cod e generat o singură dată de aplicație și
  // trebuie revendicat o singură dată — un conflict aici e o anomalie, nu
  // un caz de suprascris liniștit.
  const { error: insertError } = await admin.from('app_auth_handoff').insert({
    code,
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: user.id,
  })

  if (insertError) {
    console.error('app_auth_handoff insert failed:', insertError)
    return json({ error: 'Could not register code' }, 500)
  }

  return json({ ok: true })
})
