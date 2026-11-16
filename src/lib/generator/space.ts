/**
 * Generatorul AI: Stable Audio 3 (Stability AI), prin Space-ul oficial de pe
 * Hugging Face. Cererea pleacă direct de pe calculatorul userului, fără cont
 * și fără cheie — fiecare user are propria cotă zilnică gratuită de GPU
 * (ZeroGPU), nu una comună pentru toată aplicația.
 *
 * Protocolul e coada Gradio (sse_v3): intri în coadă cu `queue/join`, apoi
 * citești evenimentele din `queue/data` — locul în coadă, începutul,
 * progresul pe pași și, la final, linkul spre fișierul WAV.
 */

export const SPACE_URL = 'https://stabilityai-stable-audio-3.hf.space';

/** small-sfx: one-shot-uri și efecte; small-music: loop-uri; medium: calitate maximă, mai lent. */
export type Variant = 'small-sfx' | 'small-music' | 'medium';

export interface GenerateParams {
  prompt: string;
  variant: Variant;
  seconds: number;
  seed: number;
}

export type GenerateEvent =
  | { type: 'queue'; rank: number; etaSec: number | null }
  | { type: 'start'; etaSec: number | null }
  | { type: 'progress'; p: number }
  | { type: 'download' };

/** `auth`: tokenul Hugging Face al userului nu mai e valid. */
export type SpaceErrorKind = 'quota' | 'busy' | 'down' | 'failed' | 'auth';

export class SpaceError extends Error {
  readonly kind: SpaceErrorKind;
  /** Pentru `quota`: în câte secunde se poate genera din nou, dacă serverul a spus. */
  readonly retryInSec: number | null;

  constructor(kind: SpaceErrorKind, message: string, retryInSec: number | null = null) {
    super(message);
    this.name = 'SpaceError';
    this.kind = kind;
    this.retryInSec = retryInSec;
  }
}

/** Pașii de difuzie — cât folosește și interfața Space-ului. */
const STEPS = 8;
const CFG = 1;
const SAMPLER = 'pingpong';

let fnIndex: Promise<number> | null = null;

/** Indexul funcției `infer` din config — se poate schimba când Space-ul primește un update. */
function inferIndex(signal?: AbortSignal): Promise<number> {
  if (!fnIndex) {
    fnIndex = fetch(`${SPACE_URL}/config`, { signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`config_${r.status}`))))
      .then((cfg: { dependencies?: { id: number; api_name?: string }[] }) => {
        const dep = cfg.dependencies?.find(d => d.api_name === 'infer');
        if (!dep) throw new Error('no_infer');
        return dep.id;
      })
      .catch(err => {
        fnIndex = null;
        throw err;
      });
  }
  return fnIndex;
}

/** „Try again in 0:12:34” → secunde. */
function parseRetry(text: string): number | null {
  const m = /try again in (\d+):(\d{2}):(\d{2})/i.exec(text);
  const sec = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
  // „0:00:00” apare când cota se reface treptat — nu e un termen real.
  return sec > 0 ? sec : null;
}

function toError(text: string | null | undefined): SpaceError {
  const msg = text ?? '';
  if (/quota/i.test(msg)) return new SpaceError('quota', msg, parseRetry(msg));
  if (/queue is full|too many/i.test(msg)) return new SpaceError('busy', msg);
  return new SpaceError('failed', msg || 'generation_failed');
}

const randomHash = () => Math.random().toString(36).slice(2, 13);

/**
 * Generează un sunet și îl întoarce ca bytes WAV (44.1 kHz, stereo).
 * Cu `signal` cererea se poate anula — și o scoatem din coada Space-ului.
 * Cu `token` (Hugging Face, al userului) cota GPU e a contului lui, mai mare
 * decât cea anonimă, pe IP.
 */
export async function generate(
  params: GenerateParams,
  onEvent: (e: GenerateEvent) => void,
  signal?: AbortSignal,
  token?: string | null
): Promise<Uint8Array> {
  const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  let index: number;
  try {
    index = await inferIndex(signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new SpaceError('down', String(err));
  }

  const session = randomHash();
  let join: Response;
  try {
    join = await fetch(`${SPACE_URL}/gradio_api/queue/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({
        data: [params.variant, params.prompt, params.seconds, STEPS, CFG, SAMPLER, params.seed],
        fn_index: index,
        session_hash: session,
        event_data: null,
        trigger_id: null,
      }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new SpaceError('down', String(err));
  }
  if (join.status === 401 || join.status === 403) throw new SpaceError('auth', `join_${join.status}`);
  if (join.status === 429 || join.status === 503) throw new SpaceError('busy', `join_${join.status}`);
  if (!join.ok) throw new SpaceError('down', `join_${join.status}`);
  const { event_id: eventId } = (await join.json()) as { event_id: string };

  // Anularea scoate cererea și din coada Space-ului, nu doar de aici.
  const onAbort = () => {
    fetch(`${SPACE_URL}/gradio_api/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_hash: session, fn_index: index, event_id: eventId }),
    }).catch(() => {});
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const fileUrl = await readQueue(session, onEvent, signal, auth);
    onEvent({ type: 'download' });
    const res = await fetch(fileUrl, { signal });
    if (!res.ok) throw new SpaceError('failed', `file_${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

interface QueueMessage {
  msg: string;
  rank?: number;
  rank_eta?: number | null;
  eta?: number | null;
  success?: boolean;
  title?: string;
  message?: string;
  progress_data?: { progress: number | null; index: number | null; length: number | null }[] | null;
  output?: { data?: { url?: string }[]; error?: string | null };
}

/** Citește evenimentele cozii până la rezultat; întoarce URL-ul fișierului. */
async function readQueue(
  session: string,
  onEvent: (e: GenerateEvent) => void,
  signal: AbortSignal | undefined,
  auth: Record<string, string>
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${SPACE_URL}/gradio_api/queue/data?session_hash=${session}`, {
      headers: { Accept: 'text/event-stream', ...auth },
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new SpaceError('down', String(err));
  }
  if (res.status === 401 || res.status === 403) throw new SpaceError('auth', `data_${res.status}`);
  if (!res.ok || !res.body) throw new SpaceError('down', `data_${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      let m: QueueMessage;
      try {
        m = JSON.parse(line.slice(5));
      } catch {
        continue;
      }
      switch (m.msg) {
        case 'estimation':
          onEvent({ type: 'queue', rank: m.rank ?? 0, etaSec: m.rank_eta ?? null });
          break;
        case 'process_starts':
          onEvent({ type: 'start', etaSec: m.eta ?? null });
          break;
        case 'progress': {
          const pd = m.progress_data?.[0];
          const p = pd?.progress ?? (pd?.index != null && pd.length ? pd.index / pd.length : null);
          if (p != null) onEvent({ type: 'progress', p: Math.min(1, Math.max(0, p)) });
          break;
        }
        case 'process_completed': {
          reader.cancel().catch(() => {});
          const url = m.output?.data?.[0]?.url;
          if (m.success && url) return url;
          throw toError(m.output?.error ?? m.title);
        }
        case 'unexpected_error':
          reader.cancel().catch(() => {});
          throw toError(m.message);
      }
    }
  }
  throw new SpaceError('failed', 'stream_closed');
}
