import { SoundItem } from '../data/mockData';

/**
 * Rând brut din tabela `sounds` → `SoundItem`. Coloana din DB e
 * `key_signature`, dar UI-ul citește `key` — o copie care uita maparea
 * (useLibraryStore) lăsa coloana Key goală în My Sounds.
 */
export function mapSoundRow(item: any): SoundItem {
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    bpm: item.bpm,
    key: item.key_signature,
    tags: item.tags || [],
    duration: item.duration || '0:00',
    type: item.type,
    file_url: item.file_url,
    preview_url: item.preview_url ?? undefined,
    storage_path: item.storage_path ?? undefined,
    owner_id: item.owner_id ?? undefined,
    license: item.license,
  };
}
