export interface SoundItem {
  id: string;
  title: string;
  author: string;
  bpm: number | null;
  key: string | null;
  tags: string[];
  duration: string;
  type: 'loop' | 'one-shot' | 'fx';
  file_url?: string;
  /** URL public al preview-ului mp3. Sursa pentru redare. */
  preview_url?: string;
  /** Cheia obiectului în bucket-ul privat. Nu se folosește direct din client. */
  storage_path?: string;
  /** Utilizatorul care a urcat sunetul. Absent pentru încărcările vechi. */
  owner_id?: string;
  /**
   * Calea reală de pe disc, doar pentru fișierele locale. `file_url` e deja
   * un URL `asset://` convertit prin `convertFileSrc` — util pentru redare
   * în `<audio>`, dar drag-and-drop-ul nativ către alte aplicații (un DAW)
   * are nevoie de calea de fișier brută, nu de URL-ul convertit.
   */
  local_path?: string;
  /** 'royalty_free' | 'attribution_required' | 'exclusive'. Absent pe datele vechi. */
  license?: string;
}
