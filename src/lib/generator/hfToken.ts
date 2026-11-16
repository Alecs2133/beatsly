/**
 * Tokenul Hugging Face al userului — opțional. Fără el, cota gratuită de GPU
 * e pe adresa IP și ajunge cam la 5 generări pe zi; cu un cont gratuit HF
 * crește la ~40. Tokenul e al userului și rămâne doar pe calculatorul lui:
 * nu trece prin serverele noastre, merge direct la Hugging Face.
 */

const KEY = 'beatsly_hf_token';

export function getHfToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setHfToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    // stocare blocată — tokenul ține doar până la închiderea aplicației
  }
}

/** Verifică tokenul la Hugging Face și întoarce numele contului. */
export async function whoami(token: string): Promise<string> {
  const res = await fetch('https://huggingface.co/api/whoami-v2', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) throw new Error('invalid_token');
  if (!res.ok) throw new Error(`whoami_${res.status}`);
  const data = (await res.json()) as { name?: string };
  return data.name ?? '?';
}
