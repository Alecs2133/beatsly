import { create } from 'zustand';
import { SoundItem } from '../types/sound';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useAppStore } from './useAppStore';
import { mapSoundRow } from '../lib/soundRow';
import { fetchAllPages, fetchByIdChunks } from '../lib/paging';
import { translate } from '../hooks/useTranslation';
import { errorMessage } from '../lib/errors';

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
    const { showToast, language } = useAppStore.getState();
    const user = useAuthStore.getState().user;
    if (!user) {
      showToast(translate(language, 'logged_in_save'), 'error');
      return;
    }

    const exists = get().savedSounds.some(s => s.id === sound.id);

    // Starea locală se schimbă doar după ce baza de date confirmă — altfel
    // (sesiune expirată, rețea) inima arăta „salvat”, dar după repornire
    // sunetul nu mai era în My Sounds.
    const { error } = exists
      ? await supabase
          .from('user_libraries')
          .delete()
          .eq('user_id', user.id)
          .eq('sound_id', sound.id)
      : await supabase
          .from('user_libraries')
          .insert({ user_id: user.id, sound_id: sound.id });

    if (error) {
      console.error('toggleSaveSound failed:', error);
      showToast(`${translate(language, 'save_failed')} ${errorMessage(error)}`, 'error');
      return;
    }

    if (exists) {
      set((state) => ({ savedSounds: state.savedSounds.filter(s => s.id !== sound.id) }));
      showToast(translate(language, 'removed_from_sounds'), 'info');
    } else {
      set((state) => ({ savedSounds: [...state.savedSounds, sound] }));
      showToast(translate(language, 'saved_to_sounds'), 'success');
    }
  },

  isSaved: (soundId) => get().savedSounds.some(s => s.id === soundId)
}));
