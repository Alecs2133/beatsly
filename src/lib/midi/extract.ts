/**
 * Ieșirea modelului → note. Rulează în worker (e cea mai scumpă parte după
 * model — pe 30 s de audio ~0.7 s, ceea ce pe firul principal îngheța
 * interfața la fiecare mișcare de slider). Fără TensorFlow aici: doar
 * post-procesarea lui Basic Pitch.
 */
import { noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch/esm/toMidi';
import type { DetectedNote } from './notes';

/** Cadre pe secundă în ieșirea modelului (22050 / 256). */
export const MODEL_FPS = 22050 / 256;

export interface ExtractOptions {
  /** 0–1: cât de ușor acceptă o notă nouă. Mai mare = mai multe note, inclusiv cele slabe. */
  sensitivity: number;
  /** Cea mai scurtă notă păstrată, în milisecunde. */
  minNoteMs: number;
  /** Limitează căutarea la o zonă de frecvențe (ex. doar bas). */
  minPitch?: number;
  maxPitch?: number;
}

const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/**
 * Reglajele se traduc în pragurile lui Basic Pitch: sensibilitatea coboară
 * pragul pentru începutul unei note (onset) și pentru cât de „prezentă”
 * trebuie să fie ca să continue (frame).
 */
export function extractNotes(frames: number[][], onsets: number[][], opts: ExtractOptions): DetectedNote[] {
  const s = Math.min(1, Math.max(0, opts.sensitivity));
  const onsetThresh = 0.75 - s * 0.5; // 0.75 … 0.25
  const frameThresh = 0.45 - s * 0.3; // 0.45 … 0.15
  const minNoteFrames = Math.max(1, Math.round((opts.minNoteMs / 1000) * MODEL_FPS));

  // outputToNotesPoly modifică matricele primite — lucrăm pe copii.
  const events = outputToNotesPoly(
    frames.map(r => r.slice()),
    onsets.map(r => r.slice()),
    onsetThresh,
    frameThresh,
    minNoteFrames,
    true,
    opts.maxPitch != null ? midiToHz(opts.maxPitch) : null,
    opts.minPitch != null ? midiToHz(opts.minPitch) : null,
    true
  );

  return noteFramesToTime(events)
    .map(n => ({
      startSec: n.startTimeSeconds,
      durationSec: n.durationSeconds,
      pitch: n.pitchMidi,
      amplitude: n.amplitude,
    }))
    .filter(n => n.durationSec > 0)
    .sort((a, b) => a.startSec - b.startSec);
}
