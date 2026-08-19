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
}

export const mockSounds: SoundItem[] = [
  {
    id: '1',
    title: 'Neon Synths Vol. 1',
    author: 'SynthWave Labs',
    bpm: 120,
    key: 'C min',
    tags: ['synth', 'retro', '80s'],
    duration: '0:16',
    type: 'loop'
  },
  {
    id: '2',
    title: 'Heavy Sub Bass',
    author: 'BassHead',
    bpm: 140,
    key: 'F# min',
    tags: ['bass', 'dubstep', 'heavy'],
    duration: '0:08',
    type: 'loop'
  },
  {
    id: '3',
    title: 'Cinematic Impact',
    author: 'FoleyWorks',
    bpm: null,
    key: null,
    tags: ['fx', 'impact', 'cinematic'],
    duration: '0:04',
    type: 'fx'
  },
  {
    id: '4',
    title: 'LoFi Drum Break',
    author: 'ChillBeats',
    bpm: 85,
    key: null,
    tags: ['drums', 'lofi', 'chill'],
    duration: '0:05',
    type: 'loop'
  },
  {
    id: '5',
    title: 'Ethereal Vocal Chop',
    author: 'Vocalizer',
    bpm: 128,
    key: 'D maj',
    tags: ['vocal', 'edm', 'ethereal'],
    duration: '0:02',
    type: 'one-shot'
  }
];
