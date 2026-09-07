/**
 * Parsare și compatibilitate armonică pentru tonalități libere ("Am",
 * "F# minor", "C#maj", etc.) — regula Camelot pe care o folosesc
 * producătorii/DJ-ii la mixaj armonic: două tonalități se potrivesc dacă au
 * exact același cod, dacă diferă cu ±1 pe roată (aceeași literă — o cvintă
 * distanță), sau dacă e relativa major/minor (același număr, literă diferită).
 *
 * Harta circle-of-fifths de mai jos e aceeași folosită în motorul de analiză
 * audio din src-tauri (crate-ul `stratum-dsp`, funcția `Key::numerical()`,
 * verificată acolo prin doctests reale) — ca o tonalitate detectată automat
 * dintr-un fișier local și una tastată manual la publicare să fie comparabile
 * cu același sens muzical.
 */

export interface ParsedKey {
  /** 0=C, 1=C#, ..., 11=B */
  root: number;
  mode: 'major' | 'minor';
}

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5,
  'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const KEY_PATTERN = /^([A-G])(#|B)?\s*(MIN(?:OR)?|MAJ(?:OR)?|M)?$/;

/**
 * Parsează un șir liber de tonalitate. Tolerant la formatele întâlnite în
 * date reale: "Am", "A min", "A minor", "F#maj", "F#", "C#m", "Db".
 * Fără sufix de mod (ex. doar "C"), presupunem major — convenția uzuală.
 * Întoarce `null` dacă șirul nu se potrivește cu niciun tipar cunoscut,
 * pentru ca apelantul să excludă sunetul din filtrare, nu să-l potrivească
 * greșit.
 */
export function parseKey(raw: string | null | undefined): ParsedKey | null {
  if (!raw) return null;
  const match = raw.trim().toUpperCase().match(KEY_PATTERN);
  if (!match) return null;

  const [, letter, accidental, modeToken] = match;
  const root = NOTE_TO_SEMITONE[accidental ? `${letter}${accidental}` : letter];
  if (root === undefined) return null;

  const mode: ParsedKey['mode'] =
    modeToken === 'M' || modeToken?.startsWith('MIN') ? 'minor' : 'major';

  return { root, mode };
}

// Poziția fiecărei tonice majore pe roata Camelot (index = poziție - 1).
const CIRCLE_OF_FIFTHS_MAJOR = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
// Relativa minoră a fiecărei poziții majore corespunzătoare.
const CIRCLE_OF_FIFTHS_MINOR = [9, 4, 11, 6, 1, 8, 3, 10, 5, 0, 7, 2];

export function toCamelot(key: ParsedKey): string {
  const wheel = key.mode === 'major' ? CIRCLE_OF_FIFTHS_MAJOR : CIRCLE_OF_FIFTHS_MINOR;
  const position = wheel.indexOf(key.root);
  return `${position + 1}${key.mode === 'major' ? 'A' : 'B'}`;
}

/**
 * True dacă `candidate` se potrivește armonic cu `reference`: cod identic,
 * relativă major/minor (același număr, literă diferită), sau adiacentă pe
 * roată (aceeași literă, ±1 poziție, cu wrap-around 1↔12).
 */
export function isHarmonicallyCompatible(reference: ParsedKey, candidate: ParsedKey): boolean {
  const ref = toCamelot(reference);
  const cand = toCamelot(candidate);
  if (ref === cand) return true;

  const refNum = parseInt(ref, 10);
  const refLetter = ref.slice(-1);
  const candNum = parseInt(cand, 10);
  const candLetter = cand.slice(-1);

  if (refNum === candNum && refLetter !== candLetter) return true;

  if (refLetter === candLetter) {
    const diff = Math.abs(refNum - candNum);
    if (diff === 1 || diff === 11) return true;
  }

  return false;
}

export interface KeyOption {
  label: string;
  key: ParsedKey;
}

/** Toate cele 24 de tonalități — pentru un dropdown de selecție. */
export const ALL_KEYS: KeyOption[] = [
  ...NOTE_NAMES.map((label, root) => ({ label, key: { root, mode: 'major' as const } })),
  ...NOTE_NAMES.map((label, root) => ({ label: `${label}m`, key: { root, mode: 'minor' as const } })),
];
