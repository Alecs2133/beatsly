import { SoundItem } from '../data/mockData';
import type { Tables } from './database.types';

/**
 * Rând brut din tabela `sounds` → `SoundItem`. Coloana din DB e
 * `key_signature`, dar UI-ul citește `key` — o copie care uita maparea
 * (useLibraryStore) lăsa coloana Key goală în My Sounds.
 */
export function mapSoundRow(item: Tables<'sounds'>): SoundItem {
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    bpm: item.bpm,
    key: item.key_signature,
    tags: item.tags || [],
    duration: item.duration || '0:00',
    // CHECK-ul din DB limitează valorile; tipul generat vede doar `text`.
    type: item.type as SoundItem['type'],
    file_url: item.file_url ?? undefined,
    preview_url: item.preview_url ?? undefined,
    storage_path: item.storage_path ?? undefined,
    owner_id: item.owner_id ?? undefined,
    license: item.license,
  };
}
