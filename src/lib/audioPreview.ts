/**
 * Generarea preview-urilor audio.
 *
 * Bucket-ul cu fișierele complete este privat; audiția din grilă folosește
 * aceste preview-uri, care sunt publice. Ca preview-ul să nu fie un substitut
 * pentru sample-ul plătit, îl degradăm deliberat:
 *   - mono
 *   - 22.05 kHz
 *   - 96 kbps
 *   - trunchiat la 30 de secunde
 *
 * Suficient pentru a decide dacă un sunet îți place, nefolosibil într-o
 * producție. Encoder-ul e pur JavaScript, deci dă același rezultat pe Windows
 * și pe macOS — spre deosebire de `MediaRecorder`, ale cărui formate diferă
 * între WebView2 și WKWebView.
 */

export const PREVIEW_SAMPLE_RATE = 22050;
export const PREVIEW_BITRATE_KBPS = 96;
export const PREVIEW_MAX_SECONDS = 30;

/** Cât de mari sunt bucățile trimise encoder-ului. Valoarea uzuală pentru lame. */
const SAMPLES_PER_FRAME = 1152;

let decodeContext: AudioContext | null = null;

function getDecodeContext(): AudioContext {
  if (!decodeContext) {
    decodeContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  return decodeContext;
}

/**
 * Amestecă toate canalele într-unul singur și reeșantionează la rata de
 * preview, folosind un OfflineAudioContext (reeșantionare de calitate, făcută
 * de browser, nu de noi).
 */
async function toMonoPreviewBuffer(source: AudioBuffer): Promise<Float32Array> {
  const durationSeconds = Math.min(source.duration, PREVIEW_MAX_SECONDS);
  const frameCount = Math.max(
    1,
    Math.ceil(durationSeconds * PREVIEW_SAMPLE_RATE)
  );

  const offline = new OfflineAudioContext(1, frameCount, PREVIEW_SAMPLE_RATE);

  // Copiem doar porțiunea care ne interesează, ca să nu reeșantionăm degeaba
  // un fișier de 5 minute când păstrăm 30 de secunde.
  const sliceFrames = Math.min(
    source.length,
    Math.ceil(durationSeconds * source.sampleRate)
  );
  const slice = new AudioBuffer({
    length: sliceFrames,
    numberOfChannels: source.numberOfChannels,
    sampleRate: source.sampleRate,
  });

  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    slice.copyToChannel(
      source.getChannelData(ch).subarray(0, sliceFrames),
      ch
    );
  }

  const node = offline.createBufferSource();
  node.buffer = slice;
  node.connect(offline.destination);
  node.start();

  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/** Float32 [-1, 1] → Int16, cu limitare ca să evităm wrap-around la clipping. */
function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/**
 * Produce un preview mp3 dintr-un fișier audio.
 *
 * @param input fișierul sursă, ca Blob sau ArrayBuffer
 * @returns un Blob `audio/mpeg`
 */
export async function createPreviewMp3(
  input: Blob | ArrayBuffer
): Promise<Blob> {
  const arrayBuffer =
    input instanceof Blob ? await input.arrayBuffer() : input;

  // `decodeAudioData` consumă (detașează) buffer-ul primit, așa că îi dăm o
  // copie — apelantul poate avea nevoie de original pentru upload.
  const decoded = await getDecodeContext().decodeAudioData(
    arrayBuffer.slice(0)
  );

  const mono = await toMonoPreviewBuffer(decoded);
  const pcm = toInt16(mono);

  // Import dinamic: encoder-ul are ~100 KB și e folosit doar la publicare și
  // în panoul de admin, deci nu are ce căuta în chunk-ul principal.
  const lamejs = await import('@breezystack/lamejs');
  const encoder = new lamejs.Mp3Encoder(
    1,
    PREVIEW_SAMPLE_RATE,
    PREVIEW_BITRATE_KBPS
  );

  const chunks: Uint8Array[] = [];

  for (let i = 0; i < pcm.length; i += SAMPLES_PER_FRAME) {
    const frame = pcm.subarray(i, i + SAMPLES_PER_FRAME);
    const encoded = encoder.encodeBuffer(frame);
    if (encoded.length > 0) chunks.push(encoded);
  }

  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(tail);

  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
}

/** `nume_fisier.wav` → `nume_fisier.mp3`, pentru cheia din bucket-ul de preview. */
export function previewObjectName(storagePath: string): string {
  return storagePath.replace(/\.[^./]+$/, '') + '.mp3';
}
