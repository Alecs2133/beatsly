import type { GridNote } from './notes';

/** Rezoluția fișierului: câte tick-uri are o pătrime. 480 e standardul DAW-urilor. */
export const PPQ = 480;

/** Număr de lungime variabilă, cum îl cere formatul MIDI (7 biți pe octet). */
function varLen(value: number): number[] {
  let v = Math.max(0, Math.round(value));
  const bytes = [v & 0x7f];
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const u16 = (n: number) => [(n >>> 8) & 0xff, n & 0xff];
const ascii = (s: string) => Array.from(s, c => c.charCodeAt(0) & 0x7f);
/** Numele pistei în ASCII curat: „Melodie_ș” → „Melodie_s”, nu caractere stricate. */
const trackName = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '_');

interface Options {
  bpm: number;
  /** Numele pistei — îl vezi în DAW când tragi fișierul. */
  name?: string;
  /** Canal MIDI 0–15. */
  channel?: number;
}

/**
 * Fișier MIDI standard (format 0, o singură pistă): tempo, măsură 4/4 și
 * notele. Se deschide în orice DAW, direct în piano roll.
 */
export function writeMidi(notes: GridNote[], { bpm, name = 'beats.ly', channel = 0 }: Options): Uint8Array {
  const ch = channel & 0x0f;
  const toTicks = (beats: number) => Math.round(beats * PPQ);

  type Ev = { tick: number; order: number; bytes: number[] };
  const events: Ev[] = [];
  for (const n of notes) {
    const on = toTicks(n.startBeat);
    const off = Math.max(on + 1, toTicks(n.startBeat + n.durationBeats));
    const pitch = Math.max(0, Math.min(127, Math.round(n.pitch)));
    const vel = Math.max(1, Math.min(127, Math.round(n.velocity)));
    events.push({ tick: on, order: 1, bytes: [0x90 | ch, pitch, vel] });
    // Note-off înainte de note-on la același tick — altfel o notă repetată s-ar tăia singură.
    events.push({ tick: off, order: 0, bytes: [0x80 | ch, pitch, 0] });
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const microsPerBeat = Math.round(60_000_000 / bpm);
  const nameBytes = ascii(trackName(name)).slice(0, 120);
  const track: number[] = [
    // nume pistă
    0x00, 0xff, 0x03, ...varLen(nameBytes.length), ...nameBytes,
    // tempo
    0x00, 0xff, 0x51, 0x03, (microsPerBeat >> 16) & 0xff, (microsPerBeat >> 8) & 0xff, microsPerBeat & 0xff,
    // măsură 4/4, 24 clock-uri pe metronom, 8 treimi de 32 pe pătrime
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,
  ];

  let last = 0;
  for (const ev of events) {
    track.push(...varLen(ev.tick - last), ...ev.bytes);
    last = ev.tick;
  }
  track.push(0x00, 0xff, 0x2f, 0x00); // sfârșitul pistei

  const header = [...ascii('MThd'), ...u32(6), ...u16(0), ...u16(1), ...u16(PPQ)];
  return new Uint8Array([...header, ...ascii('MTrk'), ...u32(track.length), ...track]);
}
