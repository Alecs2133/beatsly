import type { GridNote } from './notes';

// Profilurile Krumhansl–Kessler: cât de „acasă” sună fiecare treaptă într-o
// tonalitate majoră / minoră. Standardul pentru estimarea tonalității din note.
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const MAJOR_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

function correlation(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export interface KeyEstimate {
  /** „Am”, „Eb” — scrierea folosită în restul aplicației. */
  label: string;
  /** Cât de clar iese tonalitatea (corelația, -1…1). Sub ~0.5 e mai mult o ghicire. */
  confidence: number;
}

/**
 * Tonalitatea probabilă a notelor, ponderată cu durata (o notă ținută
 * contează mai mult decât una de trecere). `null` dacă sunt prea puține note.
 */
export function estimateKey(notes: GridNote[]): KeyEstimate | null {
  if (notes.length < 4) return null;
  const hist = new Array(12).fill(0);
  for (const n of notes) hist[((n.pitch % 12) + 12) % 12] += n.durationBeats;
  if (hist.filter(v => v > 0).length < 3) return null;

  let best: KeyEstimate & { score: number } = { label: '', confidence: -1, score: -2 };
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotated = hist.map((_, i) => hist[(i + tonic) % 12]);
    const maj = correlation(rotated, MAJOR);
    const min = correlation(rotated, MINOR);
    if (maj > best.score) best = { label: MAJOR_NAMES[tonic], confidence: maj, score: maj };
    if (min > best.score) best = { label: `${MINOR_NAMES[tonic]}m`, confidence: min, score: min };
  }
  return { label: best.label, confidence: best.confidence };
}
