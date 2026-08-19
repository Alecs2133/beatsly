import { supabase } from './supabase';

export class GenerationError extends Error {
  /** Providerul își încarcă modelul — reîncercarea are șanse să reușească. */
  readonly retryable: boolean;
  /** Creditele s-au terminat. */
  readonly outOfCredits: boolean;

  constructor(message: string, opts: { retryable?: boolean; outOfCredits?: boolean } = {}) {
    super(message);
    this.name = 'GenerationError';
    this.retryable = opts.retryable ?? false;
    this.outOfCredits = opts.outOfCredits ?? false;
  }
}

/**
 * Generează audio prin edge function-ul `generate-audio`.
 *
 * Tokenul HuggingFace NU mai trăiește în client. Anterior era citit din
 * `import.meta.env.VITE_HF_API_TOKEN`, ceea ce înseamnă că ajungea în
 * bundle-ul JS și, de acolo, în installerul distribuit public.
 *
 * Creditul se consumă tot pe server, în aceeași cerere, ca generarea să nu
 * poată fi obținută fără plată.
 */
export const generateAudio = async (prompt: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('generate-audio', {
    body: { prompt },
  });

  if (error) {
    // Corpul răspunsului de eroare e disponibil pe `context` (obiectul Response).
    const status = (error as any)?.context?.status as number | undefined;
    let detail: { error?: string; retryable?: boolean } = {};
    try {
      detail = await (error as any)?.context?.json?.() ?? {};
    } catch {
      // Corp non-JSON: rămânem pe mesajul implicit de mai jos.
    }

    if (status === 402) {
      throw new GenerationError(
        detail.error ?? 'Nu mai ai credite disponibile.',
        { outOfCredits: true }
      );
    }
    if (status === 503) {
      throw new GenerationError(
        detail.error ?? 'Modelul AI se încarcă. Încearcă din nou în ~30 de secunde.',
        { retryable: true }
      );
    }
    if (status === 401) {
      throw new GenerationError('Sesiune expirată. Autentifică-te din nou.');
    }

    throw new GenerationError(detail.error ?? error.message ?? 'Generarea a eșuat.');
  }

  // Content-Type: audio/wav => supabase-js întoarce un Blob.
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};
