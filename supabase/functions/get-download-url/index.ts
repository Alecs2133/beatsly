import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

/**
 * Emite un URL semnat pentru descărcarea fișierului complet.
 *
 * Bucket-ul `sounds` este privat, iar rolul `authenticated` nu are SELECT pe
 * `storage.objects` pentru el. Singura cale către fișier trece pe aici, deci
 * creditul nu mai poate fi ocolit copiind URL-ul public — cum era posibil cât
 * timp bucket-ul era public.
 *
 * Clientul trimite doar `sound_id`; calea în storage o rezolvă baza de date,
 * ca nimeni să nu poată cere semnarea unui obiect arbitrar.
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

/** Suficient pentru a începe descărcarea, prea scurt pentru a fi distribuit. */
const SIGNED_URL_TTL_SECONDS = 120

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  // `getUser()` fără argument citește sesiunea din storage-ul clientului,
  // care într-un edge function e gol — deci returnează 401 chiar și cu un
  // header Authorization valid. Tokenul se dă explicit.
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.slice('Bearer '.length)
  )
  if (authError || !user) {
    return json({ error: 'Sesiune invalida sau expirata' }, 401)
  }

  let soundId: string
  try {
    const body = await req.json()
    soundId = String(body?.sound_id ?? '').trim()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!UUID_RE.test(soundId)) {
    return json({ error: 'Invalid sound_id' }, 400)
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey)

  // Rezolvăm calea înainte de a lua creditul: dacă sunetul nu există sau nu e
  // aprobat, userul nu trebuie să plătească pentru nimic.
  const { data: storagePath, error: pathError } = await admin.rpc(
    'get_sound_storage_path',
    { p_sound_id: soundId }
  )

  if (pathError) {
    console.error('get_sound_storage_path failed:', pathError)
    return json({ error: 'Could not resolve sound' }, 500)
  }
  if (!storagePath) {
    return json({ error: 'Sound not found or not approved' }, 404)
  }

  // --- Creditul ------------------------------------------------------------
  const { error: creditError } = await supabase.rpc('deduct_credit')
  if (creditError) {
    console.warn(`deduct_credit failed for ${user.id}:`, creditError.message)
    return json({ error: 'Not enough credits' }, 402)
  }

  // --- URL-ul semnat -------------------------------------------------------
  const { data: signed, error: signError } = await admin.storage
    .from('sounds')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, { download: true })

  if (signError || !signed?.signedUrl) {
    console.error('createSignedUrl failed:', signError)

    // Creditul a fost deja consumat, dar userul nu primește fișierul.
    const { error: refundError } = await admin.rpc('refund_credit', {
      p_user_id: user.id,
      p_reason: 'sign_url_failed',
    })
    if (refundError) {
      console.error(`Refund failed for ${user.id}:`, refundError)
    }

    return json({ error: 'Could not prepare download' }, 502)
  }

  return json({
    url: signed.signedUrl,
    expires_in: SIGNED_URL_TTL_SECONDS,
  })
})
