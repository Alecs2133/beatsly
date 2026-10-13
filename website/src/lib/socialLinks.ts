/**
 * Link-urile publice de pe profil. Logică pură (fără Supabase), ca să poată fi
 * testată. Copie a src/lib/socialLinks.ts din aplicație — păstrează-le identice.
 */

export const SOCIAL_KEYS = ['website', 'instagram', 'youtube', 'soundcloud', 'spotify'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type SocialLinks = Partial<Record<SocialKey, string>>;

const MAX_URL_LENGTH = 200;

/**
 * Un link e acceptat doar ca http(s). Altfel, un profil ar putea conține
 * `javascript:...`, executat în aplicația altui user la click.
 * Fără schemă („instagram.com/x”) adăugăm https://.
 */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (withScheme.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Curăță un set de link-uri introduse de user: păstrează doar cheile cunoscute
 * și URL-urile valide. Întoarce și cheile respinse, pentru mesajul de eroare.
 */
export function cleanSocialLinks(input: Partial<Record<string, string>>): { links: SocialLinks; invalid: SocialKey[] } {
  const links: SocialLinks = {};
  const invalid: SocialKey[] = [];
  for (const key of SOCIAL_KEYS) {
    const raw = input[key]?.trim();
    if (!raw) continue;
    const url = normalizeUrl(raw);
    if (url) links[key] = url;
    else invalid.push(key);
  }
  return { links, invalid };
}

/** Citește `social_links` din DB (jsonb nevalidat) în siguranță, pentru afișare. */
export function readSocialLinks(value: unknown): SocialLinks {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return cleanSocialLinks(value as Record<string, string>).links;
}
