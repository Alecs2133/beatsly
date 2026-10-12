import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type { Update };

/** `null` = deja la zi. Aruncă la eroare de rețea / semnătură. */
export async function findUpdate(): Promise<Update | null> {
  return await check();
}

/**
 * Procentul descărcat, plafonat la 100. `null` când serverul nu trimite
 * Content-Length — UI-ul afișează atunci un spinner în loc de procent.
 */
export function downloadPercent(downloaded: number, total: number): number | null {
  if (!total) return null;
  return Math.min(100, Math.round((downloaded / total) * 100));
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
        onProgress?.(downloadPercent(0, total));
        break;
      case 'Progress':
        downloaded += event.data.chunkLength;
        onProgress?.(downloadPercent(downloaded, total));
        break;
      case 'Finished':
        onProgress?.(100);
        break;
    }
  });

  await relaunch();
}
