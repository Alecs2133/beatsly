import { create } from 'zustand';
import { SoundItem } from '../data/mockData';

interface LocalFilesState {
  sounds: SoundItem[];
  selectedFolder: string | null;
  loading: boolean;
  error: string | null;
  setSounds: (sounds: SoundItem[]) => void;
  addSound: (sound: SoundItem) => void;
  setSelectedFolder: (folder: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useLocalFilesStore = create<LocalFilesState>((set) => ({
  sounds: [],
  selectedFolder: null,
  loading: false,
  error: null,
  setSounds: (sounds) => set({ sounds }),
  addSound: (sound) => set((state) => ({ sounds: [...state.sounds, sound] })),
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
