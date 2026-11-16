/**
 * Notele găsite în audio și tot ce facem cu ele înainte de fișierul MIDI:
 * păstrarea unei singure voci (melodie), alinierea pe grila tempo-ului și
 * câteva statistici pentru interfață.
 */

/** O notă în timp real (secunde), cum vine din detecție. */
export interface DetectedNote {
  startSec: number;
  durationSec: number;
  pitch: number; // MIDI, 0–127
  /** 0–1, cât de tare/sigură e nota. */
  amplitude: number;
}

/** O notă pe grila muzicală (pătrimi = beats), gata de scris în MIDI. */
export interface GridNote {
  startBeat: number;
  durationBeats: number;
  pitch: number;
  velocity: number; // 1–127
}

/** Diviziunea grilei, în pătrimi: 1 = pătrime, 0.25 = șaisprezecime, 0 = fără aliniere. */
export type GridSize = 1 | 0.5 | 0.25 | 0.125 | 0;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 60 → „C4” (convenția din majoritatea DAW-urilor: C4 = Do central). */
export function pitchName(pitch: number): string {
  return `${NOTE_NAMES[((pitch % 12) + 12) % 12]}${Math.floor(pitch / 12) - 1}`;
}

/** Amplitudinea modelului (0–1) → velocity MIDI. Nimic sub 30, ca nota să se audă. */
export function toVelocity(amplitude: number): number {
  return Math.max(30, Math.min(127, Math.round(30 + amplitude * 97)));
}

/**
 * O singură voce: la orice moment rămâne nota cea mai puternică. Detecția
 * polifonică vede uneori și armonicele (aceeași notă cu o octavă mai sus,
 * mai încet) — într-o melodie acelea sunt zgomot.
 */
export function keepSingleVoice(notes: DetectedNote[], minDurationSec = 0.03): DetectedNote[] {
  const sorted = [...notes].sort((a, b) => a.startSec - b.startSec || b.amplitude - a.amplitude);
  const out: DetectedNote[] = [];
  for (const n of sorted) {
    const prev = out[out.length - 1];
    if (!prev || n.startSec >= prev.startSec + prev.durationSec) {
      out.push({ ...n });
      continue;
    }
    // Se suprapun.
    if (n.amplitude > prev.amplitude) {
      // Noua notă e mai puternică: cea veche se oprește unde începe asta.
      prev.durationSec = n.startSec - prev.startSec;
      if (prev.durationSec < minDurationSec) out.pop();
      out.push({ ...n });
    } else {
      // Rămâne cea veche; din cea nouă păstrăm doar ce trece după ea.
      const end = n.startSec + n.durationSec;
      const prevEnd = prev.startSec + prev.durationSec;
      if (end - prevEnd >= minDurationSec && n.pitch !== prev.pitch) {
        out.push({ ...n, startSec: prevEnd, durationSec: end - prevEnd });
      }
    }
  }
  return out;
}

/**
 * Secunde → pătrimi, aliniate pe grilă. Începutul se rotunjește la cea mai
 * apropiată diviziune, iar o notă durează cel puțin o diviziune. Notele de
 * pe aceeași înălțime care ajung să se suprapună sunt unite.
 */
export function toGrid(notes: DetectedNote[], bpm: number, grid: GridSize): GridNote[] {
  const beatsPerSec = bpm / 60;
  const snap = (beats: number) => (grid > 0 ? Math.round(beats / grid) * grid : beats);

  const placed = notes
    .map(n => {
      const start = snap(n.startSec * beatsPerSec);
      let end = snap((n.startSec + n.durationSec) * beatsPerSec);
      if (grid > 0 && end <= start) end = start + grid;
      if (grid === 0 && end <= start) end = start + 0.01;
      return { startBeat: start, durationBeats: end - start, pitch: n.pitch, velocity: toVelocity(n.amplitude) };
    })
    .sort((a, b) => a.startBeat - b.startBeat || a.pitch - b.pitch);

  // Aceeași înălțime, suprapusă după aliniere → o singură notă.
  const merged: GridNote[] = [];
  const lastByPitch = new Map<number, GridNote>();
  for (const n of placed) {
    const last = lastByPitch.get(n.pitch);
    if (last && n.startBeat < last.startBeat + last.durationBeats) {
      const end = Math.max(last.startBeat + last.durationBeats, n.startBeat + n.durationBeats);
      last.durationBeats = end - last.startBeat;
      last.velocity = Math.max(last.velocity, n.velocity);
      continue;
    }
    const copy = { ...n };
    merged.push(copy);
    lastByPitch.set(n.pitch, copy);
  }
  return merged;
}

/** Într-o melodie aliniată, o notă se termină cel târziu unde începe următoarea. */
export function trimOverlaps(notes: GridNote[]): GridNote[] {
  const out = notes.map(n => ({ ...n })).sort((a, b) => a.startBeat - b.startBeat);
  for (let i = 0; i < out.length - 1; i++) {
    const next = out[i + 1];
    if (out[i].startBeat + out[i].durationBeats > next.startBeat && next.startBeat > out[i].startBeat) {
      out[i].durationBeats = next.startBeat - out[i].startBeat;
    }
  }
  return out.filter(n => n.durationBeats > 0);
}

export interface NoteStats {
  count: number;
  lowest: number | null;
  highest: number | null;
  /** Lungimea în pătrimi, rotunjită în sus la măsură întreagă (4/4). */
  lengthBeats: number;
}

export function noteStats(notes: GridNote[]): NoteStats {
  if (notes.length === 0) return { count: 0, lowest: null, highest: null, lengthBeats: 4 };
  let lowest = 127;
  let highest = 0;
  let end = 0;
  for (const n of notes) {
    lowest = Math.min(lowest, n.pitch);
    highest = Math.max(highest, n.pitch);
    end = Math.max(end, n.startBeat + n.durationBeats);
  }
  return { count: notes.length, lowest, highest, lengthBeats: Math.max(4, Math.ceil(end / 4) * 4) };
}
