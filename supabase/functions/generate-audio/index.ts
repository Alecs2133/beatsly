import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

/**
 * Generare audio prin HuggingFace.
 *
 * Tokenul HuggingFace trăiește DOAR aici, ca variabilă de mediu a funcției.
 * Înainte era `VITE_HF_API_TOKEN`, deci ajungea în bundle-ul JS și de acolo
 * în installer — oricine descărca aplicația îl putea extrage.
 *
 * Funcția e și punctul unde se consumă creditul, ca generarea și plata ei să
 * fie o singură operațiune: clientul nu poate genera fără să plătească.
 */

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string
const hfToken = Deno.env.get('HF_API_TOKEN')

const HF_MODEL = Deno.env.get('HF_MODEL') ?? 'facebook/musicgen-small'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const MAX_PROMPT_LENGTH = 500

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!hfToken) {
    console.error('HF_API_TOKEN is not configured')
    return json({ error: 'AI generation is not configured' }, 503)
  }

  // --- Autentificare -------------------------------------------------------
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  // Clientul păstrează JWT-ul apelantului, ca `auth.uid()` din RPC să
  // identifice utilizatorul corect.
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

  // --- Validarea inputului -------------------------------------------------
  let prompt: string
  try {
    const body = await req.json()
    prompt = String(body?.prompt ?? '').trim()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!prompt) {
    return json({ error: 'Prompt is required' }, 400)
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return json({ error: `Prompt exceeds ${MAX_PROMPT_LENGTH} characters` }, 400)
  }

  // --- Consumul creditului -------------------------------------------------
  // Se face ÎNAINTE de apelul scump. RPC-ul e sursa de adevăr: dacă întoarce
  // eroare, userul nu are credite și nu ajungem la HuggingFace.
  const { data: creditsLeft, error: creditError } = await supabase.rpc('deduct_credit')

  if (creditError) {
    console.warn(`deduct_credit failed for ${user.id}:`, creditError.message)
    return json({ error: 'Not enough credits' }, 402)
  }

  // --- Generarea -----------------------------------------------------------
  let hfResponse: Response
  try {
    hfResponse = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    )
  } catch (err) {
    console.error('HuggingFace request failed:', err)
    await refund(user.id, 'provider_unreachable')
    return json({ error: 'Audio provider unreachable' }, 502)
  }

  if (!hfResponse.ok) {
    const detail = await hfResponse.text().catch(() => '')
    console.error(`HuggingFace ${hfResponse.status}: ${detail.slice(0, 400)}`)
    await refund(user.id, `provider_status_${hfResponse.status}`)

    // 503 la HuggingFace = modelul se încarcă în memorie. E o stare temporară
    // pe care userul o poate rezolva reîncercând, deci o comunicăm distinct.
    if (hfResponse.status === 503) {
      return json({ error: 'Model is warming up, retry in ~30s', retryable: true }, 503)
    }
    return json({ error: 'Audio generation failed' }, 502)
  }

  const audio = await hfResponse.arrayBuffer()

  return new Response(audio, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'audio/wav',
      'X-Credits-Remaining': String(creditsLeft ?? -1),
    },
  })
})

/**
 * Returnează creditul dacă generarea a eșuat după ce l-am consumat.
 * Rulează cu service_role: acordarea de credite e o operațiune privilegiată,
 * inaccesibilă rolului `authenticated`.
 */
async function refund(userId: string, reason: string) {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey) {
    console.error(`Cannot refund ${userId}: SUPABASE_SERVICE_ROLE_KEY missing`)
    return
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey)
    const { error } = await admin.rpc('refund_credit', {
      p_user_id: userId,
      p_reason: reason,
    })
    if (error) throw error
  } catch (err) {
    console.error(`Refund failed for ${userId}:`, err)
  }
}
