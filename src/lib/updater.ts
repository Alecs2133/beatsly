import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type { Update };

/** `null` = deja la zi. Aruncă la eroare de rețea / semnătură. */
export async function findUpdate(): Promise<Update | null> {
  return await check();
}

/**
 * Descarcă, instalează și repornește. Pe Windows, installer-ul NSIS închide
 * singur aplicația, deci `relaunch()` s-ar putea să nu mai fie atins — e ok.
 */
export async function installUpdate(update: Update, onProgress?: (percent: number | null) => void): Promise<void> {
  let total = 0;
  let downloaded = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        total = event.data.contentLength ?? 0;
        onProgress?.(total ? 0 : null);
        break;
      case 'Progress':
        downloaded += event.data.chunkLength;
        onProgress?.(total ? Math.min(100, Math.round((downloaded / total) * 100)) : null);
        break;
      case 'Finished':
        onProgress?.(100);
        break;
    }
  });

  await relaunch();
}
