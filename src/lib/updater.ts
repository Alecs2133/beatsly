import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { invoke } from '@tauri-apps/api/core';

export type { Update };

/** Pagina de unde se descarcă manual, când update-ul automat nu e posibil. */
export const DOWNLOAD_PAGE = 'https://beatsly.vercel.app/download';

/** `null` = deja la zi. Aruncă la eroare de rețea / semnătură. */
export async function findUpdate(): Promise<Update | null> {
  return await check();
}

/**
 * Pe Linux instalat din `.deb` sau `.rpm` update-ul automat nu funcționează
 * (vezi `can_self_update` în main.rs) — acolo userul descarcă manual.
 * La orice eroare presupunem că se poate: mai bine încercăm decât să ascundem
 * update-ul pe Windows din cauza unei comenzi care n-a răspuns.
 */
export async function canSelfUpdate(): Promise<boolean> {
  try {
    return await invoke<boolean>('can_self_update');
  } catch (err) {
    console.warn('can_self_update failed:', err);
    return true;
  }
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
