/// <reference lib="webworker" />
/**
 * Rețeaua Basic Pitch, rulată într-un Web Worker: calculul greu stă pe alt
 * fir, așa că aplicația rămâne fluidă și bara de progres se actualizează
 * cât lucrează modelul (pe firul principal, interfața îngheța până la final).
 *
 * Mesaje: { type: 'run', audio } (22 050 Hz, mono) rulează modelul și păstrează
 * ieșirea aici; { type: 'extract', id, opts } scoate notele din ea cu alte
 * reglaje. Înapoi: 'stage', 'progress', 'done', 'notes' sau 'error'. Matricele
 * modelului nu ajung niciodată pe firul principal — doar lista de note.
 */
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import { BasicPitch } from '@spotify/basic-pitch';
import { extractNotes, type ExtractOptions } from './extract';
import type { DetectedNote } from './notes';

export type WorkerIn =
  | { type: 'run'; audio: Float32Array }
  | { type: 'extract'; id: number; opts: ExtractOptions };
export type WorkerOut =
  | { type: 'stage'; stage: 'model' | 'analyze' }
  | { type: 'progress'; p: number }
  | { type: 'done'; backend: string }
  | { type: 'notes'; id: number; notes: DetectedNote[] }
  | { type: 'error'; message: string; id?: number };

const post = (msg: WorkerOut) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg);

/**
 * tfjs 3 (versiunea cerută de Basic Pitch): kernelul `Fill` din WebAssembly
 * nu pune un tip implicit când nu primește unul — iar Basic Pitch apelează
 * `tf.fill` fără tip. Îl înregistrăm din nou cu float32 implicit, cum face
 * și backend-ul WebGL.
 */
function patchWasmFill() {
  tf.unregisterKernel('Fill', 'wasm');
  tf.registerKernel({
    kernelName: 'Fill',
    backendName: 'wasm',
    kernelFunc: ({ attrs, backend }) => {
      const { shape, value, dtype } = attrs as unknown as { shape: number[]; value: number; dtype?: tf.DataType };
      const wasm = backend as unknown as {
        makeOutput: (shape: number[], dtype: tf.DataType) => tf.TensorInfo;
        typedArrayFromHeap: (t: tf.TensorInfo) => Float32Array | Int32Array;
      };
      const out = wasm.makeOutput(shape, dtype ?? (typeof value === 'number' ? 'float32' : 'string'));
      wasm.typedArrayFromHeap(out).fill(value);
      return out;
    },
  });
}

let ready: Promise<BasicPitch> | null = null;
/** Ieșirea ultimei analize — reglajele se aplică pe ea, fără să rulăm modelul iar. */
let last: { frames: number[][]; onsets: number[][] } | null = null;

/**
 * WebAssembly (SIMD) pe procesor: rezultat identic pe orice calculator și de
 * ~3× mai rapid decât timpul real. WebGL ar fi părut alegerea evidentă, dar pe
 * unele plăci video (și pe cele emulate) calculează cu precizie redusă și
 * strică detecția. Dacă WebAssembly nu pornește, rămâne JavaScript simplu.
 */
function load(): Promise<BasicPitch> {
  if (!ready) {
    ready = (async () => {
      try {
        // Relativ la adresa workerului, nu la `origin`: pe macOS aplicația rulează
        // sub `tauri://`, unde `origin` poate fi „null”.
        setWasmPaths(new URL('/tfjs-wasm/', self.location.href).href);
        patchWasmFill();
        if (!(await tf.setBackend('wasm'))) throw new Error('wasm');
      } catch {
        await tf.setBackend('cpu');
      }
      await tf.ready();
      const model = new BasicPitch(new URL('/models/basic-pitch/model.json', self.location.href).href);
      await model.model;
      return model;
    })();
  }
  return ready;
}

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  if (msg.type === 'extract') {
    try {
      if (!last) throw new Error('no_analysis');
      post({ type: 'notes', id: msg.id, notes: extractNotes(last.frames, last.onsets, msg.opts) });
    } catch (err) {
      post({ type: 'error', id: msg.id, message: err instanceof Error ? err.message : String(err) });
    }
    return;
  }
  try {
    last = null;
    post({ type: 'stage', stage: 'model' });
    const model = await load();
    post({ type: 'stage', stage: 'analyze' });
    const frames: number[][] = [];
    const onsets: number[][] = [];
    await model.evaluateModel(
      msg.audio,
      (f, o) => {
        frames.push(...f);
        onsets.push(...o);
      },
      p => post({ type: 'progress', p })
    );
    last = { frames, onsets };
    post({ type: 'done', backend: tf.getBackend() });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
