/**
 * Audio → note, cu Basic Pitch (Spotify, Apache 2.0): o rețea neurală mică
 * antrenată pe instrumente reale, care rulează local. Nimic nu pleacă de pe
 * calculator.
 *
 * Pași: decodăm fișierul și îl aducem la ce cere modelul (22 050 Hz, mono) —
 * aici, pe firul principal, pentru că decodarea audio nu există în workeri.
 * Tot restul (modelul și transformarea ieșirii lui în note) rulează într-un
 * Web Worker (model.worker.ts), ca aplicația să nu înghețe nici la analiză,
 * nici când userul mută un reglaj.
 */
import type { WorkerIn, WorkerOut } from './model.worker';
import type { ExtractOptions } from './extract';
import type { DetectedNote } from './notes';

export type { ExtractOptions } from './extract';

const MODEL_SAMPLE_RATE = 22050;
/** Mai mult de atât durează mult și nu prea are sens pentru un sample. */
export const MAX_SECONDS = 180;

/** O analiză terminată — ieșirea modelului stă în worker. */
export interface Analysis {
  durationSec: number;
}

/** Etapele analizei, pentru ecranul de progres. */
export type Stage = 'read' | 'decode' | 'model' | 'analyze';
/** Etapele încărcării sunetului, imediat după drop. */
export type LoadStage = 'read' | 'decode' | 'tempo';

/** Citește fișierul cu progres pe bytes (0–1), când serverul dă mărimea. */
export async function readWithProgress(url: string, onProgress: (p: number) => void, signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`read_${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !total) return res.arrayBuffer();
  const reader = res.body.getReader();
  const out = new Uint8Array(total);
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    // Mărimea anunțată e doar orientativă — nu scriem peste capăt.
    if (got + value.length > out.length) return concatRest(out.subarray(0, got), value, reader);
    out.set(value, got);
    got += value.length;
    onProgress(got / total);
  }
  return out.buffer.slice(0, got);
}

async function concatRest(head: Uint8Array, chunk: Uint8Array, reader: ReadableStreamDefaultReader<Uint8Array>): Promise<ArrayBuffer> {
  const parts = [head, chunk];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
  }
  return new Blob(parts).arrayBuffer();
}

/** Decodează orice format suportat de browser și îl aduce la 22 050 Hz mono. */
export async function decodeForModel(data: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(data);
    if (decoded.duration > MAX_SECONDS) {
      throw new Error(`too_long:${Math.round(decoded.duration)}`);
    }
    const frames = Math.ceil(decoded.duration * MODEL_SAMPLE_RATE);
    // Destinația cu un singur canal face și mixajul stereo → mono.
    const offline = new OfflineAudioContext(1, frames, MODEL_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return await offline.startRendering();
  } finally {
    ctx.close().catch(() => {});
  }
}

// Un singur worker, păstrat între analize: modelul se încarcă o dată.
let worker: Worker | null = null;
let lastBackend = 'wasm';
let nextId = 1;

function getWorker(): Worker {
  if (!worker) worker = new Worker(new URL('./model.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

function killWorker() {
  worker?.terminate();
  worker = null;
}

/** Aruncată când userul apasă „Anulează”. */
export class Cancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

/**
 * Rulează modelul în worker. `onProgress` primește 0–1, `onStage` etapa.
 * Cu `signal` analiza se poate opri: workerul e oprit și recreat la nevoie.
 */
export function runModel(
  audio: AudioBuffer,
  handlers: { onProgress: (p: number) => void; onStage?: (s: Stage) => void },
  signal?: AbortSignal
): Promise<Analysis> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const cleanup = () => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };
    const onMessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (m.type === 'progress') handlers.onProgress(Math.min(1, Math.max(0, m.p)));
      else if (m.type === 'stage') handlers.onStage?.(m.stage);
      else if (m.type === 'done') {
        cleanup();
        lastBackend = m.backend;
        resolve({ durationSec: audio.duration });
      } else if (m.type === 'error' && m.id === undefined) {
        cleanup();
        reject(new Error(m.message));
      }
    };
    const onError = (e: ErrorEvent) => {
      cleanup();
      killWorker();
      reject(new Error(e.message || 'worker'));
    };
    const onAbort = () => {
      cleanup();
      // Calculul din worker nu se poate întrerupe altfel — îl oprim de tot.
      killWorker();
      reject(new Cancelled());
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    signal?.addEventListener('abort', onAbort);
    // Copie: bufferul transferat devine inutilizabil aici.
    const samples = audio.getChannelData(0).slice();
    const msg: WorkerIn = { type: 'run', audio: samples };
    w.postMessage(msg, [samples.buffer]);
  });
}

/** Notele din ultima analiză, cu reglajele date. Rulează în worker. */
export function extractNotes(opts: ExtractOptions): Promise<DetectedNote[]> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('no_analysis'));
      return;
    }
    const w = worker;
    const id = nextId++;
    const onMessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if ((m.type === 'notes' || m.type === 'error') && m.id === id) {
        w.removeEventListener('message', onMessage);
        if (m.type === 'notes') resolve(m.notes);
        else reject(new Error(m.message));
      }
    };
    w.addEventListener('message', onMessage);
    const msg: WorkerIn = { type: 'extract', id, opts };
    w.postMessage(msg);
  });
}

/** „wasm” sau „cpu” — cu ce a rulat ultima analiză. */
export function activeBackend(): string {
  return lastBackend;
}
