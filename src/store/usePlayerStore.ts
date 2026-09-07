import { create } from 'zustand';
import { SoundItem } from '../data/mockData';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: SoundItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  audio: HTMLAudioElement;

  /** Lista de redare curentă și poziția track-ului activ în ea. */
  queue: SoundItem[];
  queueIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;

  /**
   * Pornește redarea unei liste întregi (ex. toată grila curent afișată), de
   * la un anumit index. Asta alimentează next/prev — un `playTrack` pe un
   * singur sunet, izolat, nu are de unde ști ce vine „după".
   */
  playQueue: (tracks: SoundItem[], startIndex: number) => void;
  /**
   * Redă un singur sunet. Dacă e deja în coada curentă, sare la el fără să
   * strice coada; altfel pornește o coadă nouă, de un singur element — comod
   * pentru locuri fără context de listă (ex. previzualizare în Admin).
   */
  playTrack: (track: SoundItem) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  seekTo: (time: number) => void;
  changeVolume: (level: number) => void;
}

const globalAudio = new Audio();

/** Permutare Fisher-Yates a indicilor [0, length), cu `keepFirst` fixat pe poziția 0. */
function shuffledIndices(length: number, keepFirst: number): number[] {
  const rest = Array.from({ length }, (_, i) => i).filter(i => i !== keepFirst);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [keepFirst, ...rest];
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Cache la nivel de modul, nu în store: e doar o ordine de parcurgere
  // derivată din `queue`, nu stare pe care s-o afișeze cineva. Invalidat
  // (golit) de fiecare dată când coada sau shuffle-ul se schimbă — se
  // regenerează leneș, la următorul `next()`/`prev()`.
  let shuffledOrder: number[] = [];

  const loadAndPlay = (track: SoundItem) => {
    // Redarea folosește preview-ul public. Fișierul complet stă în bucket
    // privat și se obține doar prin `get-download-url`, contra credit.
    // Pentru fișierele locale nu există preview, deci cade pe `file_url`,
    // care e un asset:// URL de pe discul utilizatorului.
    globalAudio.src = track.preview_url || track.file_url || '';
    globalAudio.volume = get().volume;
    globalAudio.play().catch(e => console.error('Error playing audio', e));
    set({ currentTrack: track, isPlaying: true });
  };

  const advance = (direction: 1 | -1) => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (queue.length === 0 || queueIndex === -1) return;

    if (shuffle && shuffledOrder.length !== queue.length) {
      shuffledOrder = shuffledIndices(queue.length, queueIndex);
    }
    const order = shuffle ? shuffledOrder : queue.map((_, i) => i);

    const pos = order.indexOf(queueIndex);
    let nextPos = pos + direction;

    if (nextPos < 0 || nextPos >= order.length) {
      if (repeat !== 'all') {
        set({ isPlaying: false });
        return;
      }
      nextPos = (nextPos + order.length) % order.length;
    }

    const targetIndex = order[nextPos];
    set({ queueIndex: targetIndex });
    loadAndPlay(queue[targetIndex]);
  };

  globalAudio.addEventListener('timeupdate', () => set({ currentTime: globalAudio.currentTime }));
  globalAudio.addEventListener('loadedmetadata', () => set({ duration: globalAudio.duration }));
  globalAudio.addEventListener('ended', () => {
    if (get().repeat === 'one') {
      globalAudio.currentTime = 0;
      globalAudio.play().catch(e => console.error('Error playing audio', e));
      return;
    }
    advance(1);
  });

  return {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    audio: globalAudio,

    queue: [],
    queueIndex: -1,
    shuffle: false,
    repeat: 'off',

    playQueue: (tracks, startIndex) => {
      if (tracks.length === 0) return;
      const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));
      shuffledOrder = [];
      set({ queue: tracks, queueIndex: idx });
      loadAndPlay(tracks[idx]);
    },

    playTrack: (track) => {
      const { currentTrack, queue } = get();
      if (currentTrack?.id === track.id) {
        get().togglePlay();
        return;
      }

      const existingIndex = queue.findIndex(t => t.id === track.id);
      if (existingIndex !== -1) {
        shuffledOrder = [];
        set({ queueIndex: existingIndex });
        loadAndPlay(track);
        return;
      }

      shuffledOrder = [];
      set({ queue: [track], queueIndex: 0 });
      loadAndPlay(track);
    },

    togglePlay: () => {
      const { currentTrack, isPlaying } = get();
      if (!currentTrack) return;
      if (isPlaying) {
        globalAudio.pause();
        set({ isPlaying: false });
      } else {
        globalAudio.play().catch(e => console.error('Error playing audio', e));
        set({ isPlaying: true });
      }
    },

    next: () => advance(1),

    prev: () => {
      // Convenție standard de player: prev în primele câteva secunde ale
      // piesei sare la track-ul anterior; după aceea, doar repornește piesa
      // curentă (evită să pierzi locul dintr-o piesă lungă la un dublu-click
      // grăbit pe "prev").
      if (get().currentTime > 3) {
        get().seekTo(0);
        return;
      }
      advance(-1);
    },

    toggleShuffle: () => {
      shuffledOrder = [];
      set(state => ({ shuffle: !state.shuffle }));
    },

    cycleRepeat: () => {
      set(state => ({
        repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
      }));
    },

    seekTo: (time) => {
      globalAudio.currentTime = time;
      set({ currentTime: time });
    },

    changeVolume: (level) => {
      globalAudio.volume = level;
      set({ volume: level });
    },
  };
});
