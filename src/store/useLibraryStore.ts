import { create } from 'zustand';
import { SoundItem } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useAppStore } from './useAppStore';
import { mapSoundRow } from '../lib/soundRow';
import { fetchAllPages, fetchByIdChunks } from '../lib/paging';

interface LibraryState {
  savedSounds: SoundItem[];
  fetchLibrary: () => Promise<void>;
  toggleSaveSound: (sound: SoundItem) => Promise<void>;
  isSaved: (soundId: string) => boolean;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  savedSounds: [],
  
  fetchLibrary: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ savedSounds: [] });
      return;
    }
    
    try {
      // Extragem toate link-urile (sound_id) din user_libraries
      const userLibs = await fetchAllPages((from, to) =>
        supabase
          .from('user_libraries')
          .select('sound_id')
          .eq('user_id', user.id)
          .order('sound_id')
          .range(from, to)
      );

      // Fetch details for these sounds from the 'sounds' table
      const soundsData = await fetchByIdChunks(
        userLibs.map(l => l.sound_id),
        chunk => supabase.from('sounds').select('*').in('id', chunk)
      );
      set({ savedSounds: soundsData.map(mapSoundRow) });
    } catch (error) {
      console.error(error);
    }
  },

  toggleSaveSound: async (sound) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      useAppStore.getState().showToast('Trebuie să fii logat pentru a salva piese.', 'error');
      return;
    }
    
    const exists = get().savedSounds.some(s => s.id === sound.id);
    
    if (exists) {
      // Remove from DB
      await supabase
        .from('user_libraries')
        .delete()
        .eq('user_id', user.id)
        .eq('sound_id', sound.id);
        
      set((state) => ({ savedSounds: state.savedSounds.filter(s => s.id !== sound.id) }));
      useAppStore.getState().showToast('Removed from My Sounds', 'info');
    } else {
      // Add to DB
      await supabase
        .from('user_libraries')
        .insert({ user_id: user.id, sound_id: sound.id });
        
      set((state) => ({ savedSounds: [...state.savedSounds, sound] }));
      useAppStore.getState().showToast('Saved to My Sounds', 'success');
    }
  },

  isSaved: (soundId) => get().savedSounds.some(s => s.id === soundId)
}));
