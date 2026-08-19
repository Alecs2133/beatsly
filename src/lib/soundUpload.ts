import { supabase } from './supabase';
import { createPreviewMp3, previewObjectName } from './audioPreview';

export interface UploadedSound {
  /** Cheia obiectului în bucket-ul privat `sounds`. */
  storagePath: string;
  /** URL public către preview-ul mp3. */
  previewUrl: string;
  /**
   * URL-ul public al fișierului complet.
   *
   * Populat doar cât timp bucket-ul `sounds` este încă public, pentru ca
   * versiunile mai vechi ale aplicației să continue să funcționeze în timpul
   * tranziției. După migrarea 20260819120400 acest URL nu mai rezolvă, iar
   * descărcările trec exclusiv prin edge function-ul `get-download-url`.
   */
  legacyPublicUrl: string;
}

/** `Some Title!` → `some_title`, ca să obținem chei de storage predictibile. */
export function slugifyForStorage(name: string): string {
  return (
    name
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase() || 'untitled'
  );
}

/**
 * Urcă fișierul complet și preview-ul generat din el.
 *
 * Preview-ul se face din același blob, deci nu mai citim fișierul a doua oară.
 * Dacă generarea preview-ului eșuează (fișier corupt, format neașteptat),
 * anulăm tot uploadul: un sunet fără preview nu poate fi audiat după ce
 * bucket-ul principal devine privat, deci ar fi invizibil în practică.
 *
 * @param ownerId utilizatorul care urcă. Devine primul segment al căii în
 *   storage (`<owner_id>/<fișier>`), formă pe care policies-urile o folosesc
 *   ca să lege obiectul de proprietar — un producător își poate șterge
 *   propriile fișiere, dar nu pe ale altcuiva.
 */
export async function uploadSoundWithPreview(
  blob: Blob,
  title: string,
  ownerId: string,
  extension = 'wav'
): Promise<UploadedSound> {
  if (!ownerId) {
    throw new Error('Lipsește identitatea utilizatorului care urcă fișierul.');
  }

  const storagePath =
    `${ownerId}/${Date.now()}_${slugifyForStorage(title)}.${extension}`;

  let preview: Blob;
  try {
    preview = await createPreviewMp3(blob);
  } catch (err) {
    throw new Error(
      `Nu s-a putut genera preview-ul audio (fișier corupt sau format nesuportat): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const { error: uploadError } = await supabase.storage
    .from('sounds')
    .upload(storagePath, blob);

  if (uploadError) throw uploadError;

  const previewPath = previewObjectName(storagePath);
  const { error: previewError } = await supabase.storage
    .from('sound-previews')
    .upload(previewPath, preview, { contentType: 'audio/mpeg' });

  if (previewError) {
    // Fără preview sunetul e inutilizabil, deci nu lăsăm în urmă un obiect
    // orfan în bucket-ul principal.
    await supabase.storage.from('sounds').remove([storagePath]);
    throw previewError;
  }

  const { data: previewPublic } = supabase.storage
    .from('sound-previews')
    .getPublicUrl(previewPath);

  const { data: legacyPublic } = supabase.storage
    .from('sounds')
    .getPublicUrl(storagePath);

  return {
    storagePath,
    previewUrl: previewPublic.publicUrl,
    legacyPublicUrl: legacyPublic.publicUrl,
  };
}

/**
 * Obține un URL semnat, valabil scurt timp, pentru fișierul complet.
 * Creditul se consumă în edge function, în aceeași cerere.
 */
export async function requestDownloadUrl(soundId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-download-url', {
    body: { sound_id: soundId },
  });

  if (error) {
    const status = (error as any)?.context?.status as number | undefined;
    let detail: { error?: string } = {};
    try {
      detail = (await (error as any)?.context?.json?.()) ?? {};
    } catch {
      // corp non-JSON
    }

    if (status === 402) throw new InsufficientCreditsError();

    // Statusul HTTP restrange imediat cauza: 401 sesiune, 404 sunet negasit
    // sau neaprobat, 502 semnarea URL-ului, 500 rezolvarea caii.
    const label = status ? `HTTP ${status}` : 'eroare retea';
    throw new Error(`${label} - ${detail.error ?? error.message ?? 'necunoscuta'}`);
  }

  if (!data?.url) throw new Error('No download URL returned');
  return data.url as string;
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Not enough credits');
    this.name = 'InsufficientCreditsError';
  }
}
