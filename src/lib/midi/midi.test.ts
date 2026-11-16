import { describe, expect, it } from 'vitest';
import { keepSingleVoice, noteStats, pitchName, toGrid, toVelocity, trimOverlaps, type DetectedNote } from './notes';
import { PPQ, writeMidi } from './writeMidi';
import { estimateKey } from './key';

const note = (startSec: number, durationSec: number, pitch: number, amplitude = 0.8): DetectedNote => ({
  startSec,
  durationSec,
  pitch,
  amplitude,
});

/** Citește notele înapoi din fișier — ca să verificăm ce ar vedea un DAW. */
function parseMidi(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer);
  const ppq = view.getUint16(12);
  let i = 14 + 8; // după MThd și antetul MTrk
  const end = bytes.length;
  let tick = 0;
  let tempo = 0;
  const on = new Map<number, number>();
  const notes: { pitch: number; start: number; end: number; vel: number }[] = [];
  const readVar = () => {
    let v = 0;
    let b;
    do {
      b = bytes[i++];
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80);
    return v;
  };
  while (i < end) {
    tick += readVar();
    const status = bytes[i++];
    if (status === 0xff) {
      const type = bytes[i++];
      const len = readVar();
      if (type === 0x51) tempo = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      i += len;
      if (type === 0x2f) break;
    } else if ((status & 0xf0) === 0x90) {
      const pitch = bytes[i++];
      const vel = bytes[i++];
      on.set(pitch, tick);
      notes.push({ pitch, start: tick, end: -1, vel });
    } else if ((status & 0xf0) === 0x80) {
      const pitch = bytes[i++];
      i++;
      const n = [...notes].reverse().find(x => x.pitch === pitch && x.end === -1);
      if (n) n.end = tick;
    }
  }
  return { ppq, tempo, notes };
}

describe('pitchName / toVelocity', () => {
  it('folosește C4 = 60', () => {
    expect(pitchName(60)).toBe('C4');
    expect(pitchName(69)).toBe('A4');
    expect(pitchName(61)).toBe('C#4');
  });

  it('ține velocity-ul între 30 și 127', () => {
    expect(toVelocity(0)).toBe(30);
    expect(toVelocity(1)).toBe(127);
    expect(toVelocity(2)).toBe(127);
  });
});

describe('toGrid', () => {
  it('aliniază pe șaisprezecimi la tempo-ul dat', () => {
    // 120 BPM: o pătrime = 0.5 s. Nota la 0.26 s ≈ 0.52 pătrimi → 0.5.
    const [n] = toGrid([note(0.26, 0.24, 60)], 120, 0.25);
    expect(n.startBeat).toBe(0.5);
    expect(n.durationBeats).toBe(0.5);
  });

  it('o notă foarte scurtă durează cel puțin o diviziune', () => {
    const [n] = toGrid([note(1, 0.01, 60)], 120, 0.25);
    expect(n.durationBeats).toBe(0.25);
  });

  it('fără grilă păstrează timpul exact', () => {
    const [n] = toGrid([note(0.3, 0.2, 60)], 120, 0);
    expect(n.startBeat).toBeCloseTo(0.6);
    expect(n.durationBeats).toBeCloseTo(0.4);
  });

  it('unește aceeași notă când se suprapune după aliniere', () => {
    // [0, 0.75] și [0.5, 1.25] → o singură notă [0, 1.25]
    const out = toGrid([note(0, 0.4, 60), note(0.3, 0.3, 60)], 120, 0.25);
    expect(out).toHaveLength(1);
    expect(out[0].durationBeats).toBe(1.25);
  });

  it('notele repetate care doar se ating rămân separate', () => {
    const out = toGrid([note(0, 0.25, 60), note(0.25, 0.25, 60)], 120, 0.25);
    expect(out.map(n => [n.startBeat, n.durationBeats])).toEqual([[0, 0.5], [0.5, 0.5]]);
  });
});

describe('keepSingleVoice', () => {
  it('scoate armonica mai slabă care se suprapune', () => {
    const out = keepSingleVoice([note(0, 1, 60, 0.9), note(0.1, 0.8, 72, 0.3)]);
    expect(out.map(n => n.pitch)).toEqual([60]);
  });

  it('o notă nouă mai puternică taie nota veche', () => {
    const out = keepSingleVoice([note(0, 1, 60, 0.5), note(0.5, 0.5, 64, 0.9)]);
    expect(out.map(n => [n.pitch, +n.durationSec.toFixed(2)])).toEqual([[60, 0.5], [64, 0.5]]);
  });
});

describe('trimOverlaps', () => {
  it('o notă se oprește unde începe următoarea', () => {
    const out = trimOverlaps([
      { startBeat: 0, durationBeats: 2, pitch: 60, velocity: 90 },
      { startBeat: 1, durationBeats: 1, pitch: 62, velocity: 90 },
    ]);
    expect(out[0].durationBeats).toBe(1);
  });
});

describe('noteStats', () => {
  it('rotunjește lungimea la măsuri întregi', () => {
    const s = noteStats([{ startBeat: 4.5, durationBeats: 1, pitch: 55, velocity: 80 }, { startBeat: 0, durationBeats: 1, pitch: 67, velocity: 80 }]);
    expect(s).toEqual({ count: 2, lowest: 55, highest: 67, lengthBeats: 8 });
  });
});

describe('writeMidi', () => {
  it('scrie un fișier valid cu tempo-ul și notele date', () => {
    const notes = [
      { startBeat: 0, durationBeats: 1, pitch: 60, velocity: 100 },
      { startBeat: 1, durationBeats: 0.5, pitch: 64, velocity: 80 },
      { startBeat: 1.5, durationBeats: 0.5, pitch: 67, velocity: 70 },
    ];
    const bytes = writeMidi(notes, { bpm: 128, name: 'Test' });
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd');
    const parsed = parseMidi(bytes);
    expect(parsed.ppq).toBe(PPQ);
    expect(parsed.tempo).toBe(Math.round(60_000_000 / 128));
    expect(parsed.notes.map(n => [n.pitch, n.start, n.end, n.vel])).toEqual([
      [60, 0, 480, 100],
      [64, 480, 720, 80],
      [67, 720, 960, 70],
    ]);
  });

  it('o notă repetată imediat nu se taie singură', () => {
    const bytes = writeMidi(
      [
        { startBeat: 0, durationBeats: 1, pitch: 60, velocity: 100 },
        { startBeat: 1, durationBeats: 1, pitch: 60, velocity: 100 },
      ],
      { bpm: 120 }
    );
    const { notes } = parseMidi(bytes);
    expect(notes.map(n => [n.start, n.end])).toEqual([[0, 480], [480, 960]]);
  });

  it('numele pistei rămâne lizibil și cu diacritice', () => {
    const bytes = writeMidi([{ startBeat: 0, durationBeats: 1, pitch: 60, velocity: 100 }], { bpm: 120, name: 'Melodie_șț_ăîâ 🎹' });
    // Meta-evenimentul 0x03 (numele pistei) stă imediat după antetul pistei.
    const at = bytes.indexOf(0x03, 22) + 1;
    const len = bytes[at];
    const name = String.fromCharCode(...bytes.slice(at + 1, at + 1 + len));
    expect(name).toBe('Melodie_st_aia __');
  });
});

describe('estimateKey', () => {
  const seq = (pitches: number[]) => pitches.map((pitch, i) => ({ startBeat: i, durationBeats: 1, pitch, velocity: 90 }));

  it('recunoaște Do major dintr-o gamă și un arpegiu', () => {
    expect(estimateKey(seq([60, 62, 64, 65, 67, 69, 71, 72, 60, 64, 67, 72]))?.label).toBe('C');
  });

  it('recunoaște La minor', () => {
    expect(estimateKey(seq([57, 60, 64, 57, 59, 60, 62, 64, 65, 64, 60, 57, 69, 57]))?.label).toBe('Am');
  });

  it('nu ghicește din prea puține note', () => {
    expect(estimateKey(seq([60, 64]))).toBeNull();
  });
});
