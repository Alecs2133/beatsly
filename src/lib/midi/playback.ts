import type { GridNote } from './notes';

/**
 * Ascultarea notelor detectate, înainte de export: un synth mic (triunghi
 * filtrat, cu atac și release scurte) ca să compari cu originalul.
 */
export interface MidiPlayer {
  /** Poziția curentă în pătrimi, sau null dacă s-a oprit. */
  positionBeats: () => number | null;
  stop: () => void;
}

const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
/** Cât înainte programăm notele. Restul se creează din mers. */
const LOOKAHEAD_SEC = 1;
const TICK_MS = 250;

export function playNotes(notes: GridNote[], bpm: number, onEnd: () => void): MidiPlayer {
  const ctx = new AudioContext();
  const secPerBeat = 60 / bpm;
  const t0 = ctx.currentTime + 0.08;
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  // Un fișier lung cu acorduri are mii de note; un oscilator pentru fiecare,
  // creat de la început, încarcă inutil pornirea. Le programăm pe rând.
  const queue = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  let next = 0;
  let end = t0;
  for (const n of queue) end = Math.max(end, t0 + (n.startBeat + Math.max(0.05 / secPerBeat, n.durationBeats)) * secPerBeat);

  const schedule = () => {
    const horizon = ctx.currentTime + LOOKAHEAD_SEC;
    while (next < queue.length) {
      const n = queue[next];
      const start = t0 + n.startBeat * secPerBeat;
      if (start > horizon) break;
      next++;
      const stop = start + Math.max(0.05, n.durationBeats * secPerBeat);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = midiToHz(n.pitch);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.min(8000, midiToHz(n.pitch) * 6);
      const g = ctx.createGain();
      const level = 0.08 + (n.velocity / 127) * 0.22;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(level, start + 0.008);
      g.gain.setTargetAtTime(level * 0.7, start + 0.02, 0.15);
      g.gain.setTargetAtTime(0, stop, 0.04);
      osc.connect(lp).connect(g).connect(master);
      osc.start(start);
      osc.stop(stop + 0.3);
    }
  };

  schedule();
  const ticker = window.setInterval(schedule, TICK_MS);

  let stopped = false;
  const timer = window.setTimeout(() => finish(), (end - ctx.currentTime + 0.35) * 1000);
  function finish() {
    if (stopped) return;
    stopped = true;
    window.clearInterval(ticker);
    window.clearTimeout(timer);
    ctx.close().catch(() => {});
    onEnd();
  }

  return {
    positionBeats: () => (stopped ? null : Math.max(0, (ctx.currentTime - t0) / secPerBeat)),
    stop: finish,
  };
}
