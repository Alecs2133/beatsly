import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.2"

/**
 * Șterge definitiv contul userului autentificat: fișierele din storage,
 * sunetele publicate, datele de profil și contul de autentificare.
 * Dreptul la ștergere (art. 17 GDPR), promis în Politica de confidențialitate.
 *
 * Un abonament plătit activ blochează ștergerea: altfel Stripe ar continua să
 * încaseze reînnoiri pentru un cont care nu mai există. Userul îl anulează
 * întâi din „Manage subscription”.
 *
 * Cere `{ "confirm": "DELETE" }` în corp — o a doua barieră, pe lângă
 * confirmarea din UI, împotriva unui apel accidental.
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

// Bucket-urile în care fișierele userului stau sub `<user_id>/`.
const USER_BUCKETS = ['sounds', 'sound-previews', 'avatars']

async function removeUserFolder(admin: SupabaseClient, bucket: string, userId: string) {
  // `list` întoarce maxim `limit` obiecte; ștergem în bucle până se golește.
  for (let round = 0; round < 50; round++) {
    const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 1000 })
    if (error) throw new Error(`list ${bucket}: ${error.message}`)
    if (!data || data.length === 0) return
    const paths = data.map((obj) => `${userId}/${obj.name}`)
    const { error: removeError } = await admin.storage.from(bucket).remove(paths)
    if (removeError) throw new Error(`remove ${bucket}: ${removeError.message}`)
    if (data.length < 1000) return
  }
}

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

  let confirm = ''
  try {
    confirm = String((await req.json())?.confirm ?? '')
  } catch {
    // corp lipsă sau invalid — tratat mai jos
  }
  if (confirm !== 'DELETE') {
    return json({ error: 'confirmation_required' }, 400)
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) {
    console.error('profile lookup failed:', profileError)
    return json({ error: 'Could not delete account' }, 500)
  }
  if (profile && profile.tier !== 'free') {
    return json({ error: 'active_subscription' }, 409)
  }

  try {
    for (const bucket of USER_BUCKETS) {
      await removeUserFolder(admin, bucket, user.id)
    }

    // Sunetele ar rămâne altfel cu owner_id NULL (FK `on delete set null`),
    // adică publice dar fără autor — Politica promite ștergerea conținutului.
    const { error: soundsError } = await admin.from('sounds').delete().eq('owner_id', user.id)
    if (soundsError) throw new Error(`sounds: ${soundsError.message}`)

    // Tabele vechi, create înainte de migrări — nu ne bazăm pe un
    // `on delete cascade` pe care nu-l putem garanta.
    for (const table of ['notifications', 'role_requests']) {
      const { error } = await admin.from(table).delete().eq('user_id', user.id)
      if (error) throw new Error(`${table}: ${error.message}`)
    }
    const { error: deleteProfileError } = await admin.from('profiles').delete().eq('id', user.id)
    if (deleteProfileError) throw new Error(`profiles: ${deleteProfileError.message}`)

    // Restul (biblioteca, colecțiile, follow-urile, crew-urile proprii) se
    // șterg în cascadă odată cu userul.
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteUserError) throw new Error(`auth: ${deleteUserError.message}`)
  } catch (err) {
    console.error(`delete-account failed for ${user.id}:`, err)
    return json({ error: 'Could not delete account' }, 500)
  }

  console.log(`Deleted account ${user.id}`)
  return json({ deleted: true })
})
