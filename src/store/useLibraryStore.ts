import { create } from 'zustand';
import { SoundItem } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useAppStore } from './useAppStore';

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
    
    // Extragem toate link-urile (sound_id) din user_libraries
    const { data: userLibs, error } = await supabase
      .from('user_libraries')
      .select('sound_id')
      .eq('user_id', user.id);
      
    if (error) {
      console.error(error);
      return;
    }
    
    if (userLibs && userLibs.length > 0) {
      const soundIds = userLibs.map(l => l.sound_id);
      // Fetch details for these sounds from the 'sounds' table
      const { data: soundsData } = await supabase
        .from('sounds')
        .select('*')
        .in('id', soundIds);
        
      if (soundsData) {
        set({ savedSounds: soundsData as SoundItem[] });
      }
    } else {
      set({ savedSounds: [] });
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
