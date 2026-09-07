import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

/**
 * Aplicația desktop face polling aici cu codul pe care l-a generat și l-a
 * pus în URL-ul deschis în browser. Vezi migrarea
 * `20260907130000_app_auth_handoff.sql` pentru fluxul complet.
 *
 * Fără Authorization header — asta e chiar modul în care aplicația obține
 * prima sesiune, deci încă nu are ce token să trimită. Codul de 256 biți e
 * singura protecție, și e suficientă: spațiul de căutare face ghicitul
 * impracticabil, indiferent de câte cereri ar trimite cineva.
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
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

const CODE_RE = /^[0-9a-f]{64}$/

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let code: string
  try {
    const body = await req.json()
    code = String(body?.code ?? '')
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!CODE_RE.test(code)) {
    return json({ error: 'Invalid code' }, 400)
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey)

  // Curățenie oportunistă — codurile nerevendicate nu au altă șansă să fie
  // șterse, nefiind niciun cron separat pentru asta.
  await admin.from('app_auth_handoff').delete().lt('expires_at', new Date().toISOString())

  const { data, error } = await admin
    .from('app_auth_handoff')
    .select('access_token, refresh_token')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    console.error('app_auth_handoff lookup failed:', error)
    return json({ error: 'Lookup failed' }, 500)
  }

  if (!data) {
    return json({ status: 'pending' }, 404)
  }

  // O singură citire posibilă — indiferent ce se întâmplă mai departe,
  // codul e ars acum.
  await admin.from('app_auth_handoff').delete().eq('code', code)

  return json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })
})
