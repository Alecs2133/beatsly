import { create } from 'zustand';
import { SoundItem } from '../data/mockData';

interface PlayerState {
  currentTrack: SoundItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: SoundItem) => void;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  changeVolume: (level: number) => void;
  audio: HTMLAudioElement;
}

const globalAudio = new Audio();

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Set up audio event listeners
  globalAudio.addEventListener('ended', () => set({ isPlaying: false }));
  globalAudio.addEventListener('timeupdate', () => set({ currentTime: globalAudio.currentTime }));
  globalAudio.addEventListener('loadedmetadata', () => set({ duration: globalAudio.duration }));

  return {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    audio: globalAudio,
    
    playTrack: (track: SoundItem) => {
      const { currentTrack } = get();
      if (currentTrack?.id === track.id) {
        get().togglePlay();
      } else {
        // Redarea folosește preview-ul public. Fișierul complet stă în
        // bucket privat și se obține doar prin `get-download-url`, contra
        // credit. Pentru fișierele locale nu există preview, deci cade pe
        // `file_url`, care e un asset:// URL de pe discul utilizatorului.
        globalAudio.src = track.preview_url || track.file_url || '';
        globalAudio.volume = get().volume;
        globalAudio.play().catch(e => console.error("Error playing audio", e));
        set({ currentTrack: track, isPlaying: true });
      }
    },
    
    togglePlay: () => {
      const { currentTrack, isPlaying } = get();
      if (!currentTrack) return;
      if (isPlaying) {
        globalAudio.pause();
        set({ isPlaying: false });
      } else {
        globalAudio.play().catch(e => console.error("Error playing audio", e));
        set({ isPlaying: true });
      }
    },
    
    seekTo: (time: number) => {
      globalAudio.currentTime = time;
      set({ currentTime: time });
    },
    
    changeVolume: (level: number) => {
      globalAudio.volume = level;
      set({ volume: level });
    }
  };
});
