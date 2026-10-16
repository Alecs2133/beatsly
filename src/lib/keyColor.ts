import { parseKey, toCamelot } from './musicKey';

/**
 * Nuanța (0–360) asociată unei tonalități, după poziția ei pe roata Camelot.
 * Tonalitățile vecine (compatibile) primesc culori apropiate, iar cardul,
 * waveform-ul și fundalul aplicației se colorează după sunetul care cântă.
 * `null` pentru sunete fără tonalitate (percuție, FX).
 */
export function keyHue(raw: string | null | undefined): number | null {
  const parsed = parseKey(raw);
  if (!parsed) return null;
  const code = toCamelot(parsed);
  const position = parseInt(code, 10);
  return ((position - 1) * 30 + (code.endsWith('B') ? 12 : 0) + 250) % 360;
}

/** Codul Camelot pentru afișare (ex. „8A”), sau null. */
export function camelotCode(raw: string | null | undefined): string | null {
  const parsed = parseKey(raw);
  return parsed ? toCamelot(parsed) : null;
}

/**
 * Tonalitatea scurtă, cum o scriu producătorii: „Am”, „F#m”, „Bb”, „C”.
 * Păstrează alterația din textul original (Bb rămâne Bb, nu devine A#).
 */
export function shortKey(raw: string | null | undefined): string | null {
  const parsed = parseKey(raw);
  if (!parsed || !raw) return null;
  const m = raw.trim().match(/^([A-Ga-g])([#bB♯♭]?)/);
  if (!m) return null;
  const acc = m[2] === '#' || m[2] === '♯' ? '#' : m[2] ? 'b' : '';
  return `${m[1].toUpperCase()}${acc}${parsed.mode === 'minor' ? 'm' : ''}`;
}
