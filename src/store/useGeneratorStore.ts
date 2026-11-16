import { create } from 'zustand';
import { mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { join, tempDir } from '@tauri-apps/api/path';
import { generate, SpaceError, type GenerateParams, type Variant } from '../lib/generator/space';
import { getHfToken } from '../lib/generator/hfToken';

export type GenPhase = 'queue' | 'generating' | 'download' | 'done' | 'error';

export interface GenItem {
  id: number;
  /** Ce a scris userul — fără BPM/tonalitatea adăugate automat. */
  text: string;
  params: GenerateParams;
  bpm: number | null;
  keyLabel: string | null;
  phase: GenPhase;
  /** 0–1 în faza de generare. */
  progress: number;
  queueRank: number | null;
  etaSec: number | null;
  startedAt: number;
  url?: string;
  /** Sunetul, ținut o singură dată în memorie (`url` arată spre el). */
  blob?: Blob;
  /** Vârfurile pentru forma de undă, 0–1. */
  peaks?: number[];
  /** Copia de pe disc, pentru drag în DAW și pentru MIDI Deconstructor. */
  path?: string;
  error?: SpaceError;
}

export interface StartOptions {
  text: string;
  variant: Variant;
  seconds: number;
  bpm: number | null;
  keyLabel: string | null;
  /** Tonalitatea scrisă pentru model: „C minor”, „Eb major”. */
  keyText: string | null;
}

interface GeneratorState {
  items: GenItem[];
  start: (opts: StartOptions) => void;
  /** Aceleași reglaje, alt seed. */
  again: (id: number) => void;
  cancel: (id: number) => void;
  remove: (id: number) => void;
}

/** Păstrăm ultimele generări din sesiune — mai vechi de atât se șterg. */
const MAX_ITEMS = 24;
const PEAKS = 72;

let seq = 0;
const controllers = new Map<number, AbortController>();

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/**
 * Promptul pentru model: ce a scris userul, plus tempo și tonalitate când
 * le-a ales. La one-shot-uri tempo-ul n-are sens, deci nu-l adăugăm.
 */
function buildPrompt(o: StartOptions): string {
  const parts = [o.text.trim()];
  if (o.variant !== 'small-sfx' && o.bpm) parts.push(`${o.bpm} BPM`);
  if (o.keyText) parts.push(o.keyText);
  return parts.join(', ');
}

async function computePeaks(bytes: Uint8Array): Promise<number[]> {
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(bytes.slice().buffer);
    const ch = buf.getChannelData(0);
    const step = Math.max(1, Math.floor(ch.length / PEAKS));
    const peaks: number[] = [];
    for (let i = 0; i < PEAKS; i++) {
      let max = 0;
      for (let j = i * step, end = Math.min(ch.length, j + step); j < end; j++) max = Math.max(max, Math.abs(ch[j]));
      peaks.push(max);
    }
    const top = Math.max(...peaks, 1e-6);
    // Rădăcină pătrată: cozile care se sting (808, reverb) rămân vizibile.
    return peaks.map(p => Math.sqrt(p / top));
  } finally {
    ctx.close().catch(() => {});
  }
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'beatsly';

export const fileNameFor = (item: GenItem) => `${slug(item.text)}_${item.params.seed % 10000}.wav`;

async function writeTemp(item: GenItem, bytes: Uint8Array): Promise<string | undefined> {
  try {
    const dir = await join(await tempDir(), 'beatsly-gen');
    await mkdir(dir, { recursive: true });
    const path = await join(dir, fileNameFor(item));
    await writeFile(path, bytes);
    return path;
  } catch (err) {
    console.error('Temp WAV write failed:', err);
    return undefined;
  }
}

export const useGeneratorStore = create<GeneratorState>((set, get) => {
  const patch = (id: number, p: Partial<GenItem>) =>
    set(s => ({ items: s.items.map(it => (it.id === id ? { ...it, ...p } : it)) }));

  const run = async (item: GenItem) => {
    const abort = new AbortController();
    controllers.set(item.id, abort);
    try {
      const bytes = await generate(
        item.params,
        e => {
          if (e.type === 'queue') patch(item.id, { phase: 'queue', queueRank: e.rank, etaSec: e.etaSec });
          else if (e.type === 'start') patch(item.id, { phase: 'generating', queueRank: null, etaSec: e.etaSec, startedAt: Date.now() });
          else if (e.type === 'progress') patch(item.id, { phase: 'generating', progress: e.p });
          else patch(item.id, { phase: 'download', progress: 1 });
        },
        abort.signal,
        getHfToken()
      );
      const stillHere = () => !abort.signal.aborted && get().items.some(it => it.id === item.id);
      if (!stillHere()) return;
      const peaks = await computePeaks(bytes).catch(() => undefined);
      // Șters cât calculam forma de undă → nu mai creăm nimic pentru el.
      if (!stillHere()) return;
      const blob = new Blob([bytes], { type: 'audio/wav' });
      patch(item.id, { phase: 'done', blob, url: URL.createObjectURL(blob), peaks });
      const path = await writeTemp(item, bytes);
      if (path && stillHere()) patch(item.id, { path });
    } catch (err) {
      if (abort.signal.aborted) return;
      patch(item.id, { phase: 'error', error: err instanceof SpaceError ? err : new SpaceError('failed', String(err)) });
    } finally {
      controllers.delete(item.id);
    }
  };

  const push = (item: GenItem) => {
    set(s => {
      const items = [item, ...s.items];
      for (const old of items.slice(MAX_ITEMS)) {
        if (old.url) URL.revokeObjectURL(old.url);
        controllers.get(old.id)?.abort();
      }
      return { items: items.slice(0, MAX_ITEMS) };
    });
    void run(item);
  };

  return {
    items: [],

    start: opts => {
      push({
        id: ++seq,
        text: opts.text.trim(),
        params: { prompt: buildPrompt(opts), variant: opts.variant, seconds: opts.seconds, seed: newSeed() },
        bpm: opts.bpm,
        keyLabel: opts.keyLabel,
        phase: 'queue',
        progress: 0,
        queueRank: null,
        etaSec: null,
        startedAt: Date.now(),
      });
    },

    again: id => {
      const src = get().items.find(it => it.id === id);
      if (!src) return;
      push({
        ...src,
        id: ++seq,
        params: { ...src.params, seed: newSeed() },
        phase: 'queue',
        progress: 0,
        queueRank: null,
        etaSec: null,
        startedAt: Date.now(),
        url: undefined,
        blob: undefined,
        peaks: undefined,
        path: undefined,
        error: undefined,
      });
    },

    cancel: id => {
      controllers.get(id)?.abort();
      get().remove(id);
    },

    remove: id => {
      controllers.get(id)?.abort();
      set(s => {
        const it = s.items.find(x => x.id === id);
        if (it?.url) URL.revokeObjectURL(it.url);
        return { items: s.items.filter(x => x.id !== id) };
      });
    },
  };
});

/** Golește tot (la schimbarea contului). */
export function resetGenerator() {
  for (const c of controllers.values()) c.abort();
  controllers.clear();
  for (const it of useGeneratorStore.getState().items) if (it.url) URL.revokeObjectURL(it.url);
  useGeneratorStore.setState({ items: [] });
}
