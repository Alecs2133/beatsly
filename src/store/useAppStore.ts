import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';
type Language = 'en' | 'ro';
export type SoundView = 'cards' | 'list';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  /** Ultimele 250ms: rulează animația de ieșire înainte de a dispărea. */
  leaving?: boolean;
}

const TOAST_MS = 3000;
const TOAST_EXIT_MS = 250;
let toastSeq = 0;

// Preferințe păstrate între porniri (limba se pierdea la fiecare repornire).
const PREFS_KEY = 'beatsly_prefs';
interface Prefs {
  language: Language;
  hoverPreview: boolean;
  soundView: SoundView;
}
function loadPrefs(): Prefs {
  const defaults: Prefs = {
    language: navigator.language?.toLowerCase().startsWith('ro') ? 'ro' : 'en',
    hoverPreview: false,
    soundView: 'cards',
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Prefs>) } : defaults;
  } catch {
    return defaults;
  }
}
function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // storage indisponibil — preferința rămâne doar pentru sesiunea curentă
  }
}

interface AppState {
  // NOTĂ: creditele NU stau aici. Sursa unică de adevăr este
  // `useAuthStore.profile.credits`, sincronizat cu baza de date.

  // --- Search ---
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // --- Preferințe (persistate) ---
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Pornește preview-ul când ții mouse-ul pe un card. */
  hoverPreview: boolean;
  setHoverPreview: (on: boolean) => void;
  /** Carduri cu waveform sau listă compactă. */
  soundView: SoundView;
  setSoundView: (view: SoundView) => void;

  // --- Filtrele din Descoperă (aici, ca să le poată seta și paleta Ctrl+K) ---
  /** Index în ALL_KEYS (musicKey.ts), sau null = orice tonalitate. */
  discoverKey: number | null;
  setDiscoverKey: (index: number | null) => void;
  /** Centrul ferestrei de ±6 BPM, sau null = orice tempo. */
  discoverBpm: number | null;
  setDiscoverBpm: (bpm: number | null) => void;
  discoverType: string;
  setDiscoverType: (type: string) => void;
  clearDiscoverFilters: () => void;

  // --- Panouri peste aplicație ---
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;

  // --- Toasts ---
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: number) => void;
}

const initial = loadPrefs();

export const useAppStore = create<AppState>((set, get) => {
  const persist = () => {
    const { language, hoverPreview, soundView } = get();
    savePrefs({ language, hoverPreview, soundView });
  };

  return {
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),

    language: initial.language,
    setLanguage: (lang) => { set({ language: lang }); persist(); },
    hoverPreview: initial.hoverPreview,
    setHoverPreview: (on) => { set({ hoverPreview: on }); persist(); },
    soundView: initial.soundView,
    setSoundView: (view) => { set({ soundView: view }); persist(); },

    discoverKey: null,
    setDiscoverKey: (index) => set({ discoverKey: index }),
    discoverBpm: null,
    setDiscoverBpm: (bpm) => set({ discoverBpm: bpm }),
    discoverType: 'ALL',
    setDiscoverType: (type) => set({ discoverType: type }),
    clearDiscoverFilters: () => set({ discoverKey: null, discoverBpm: null, discoverType: 'ALL', searchQuery: '' }),

    settingsOpen: false,
    setSettingsOpen: (open) => set({ settingsOpen: open, commandOpen: false }),
    commandOpen: false,
    setCommandOpen: (open) => set({ commandOpen: open }),

    toasts: [],
    showToast: (message, type = 'info') => {
      const id = Date.now() * 1000 + (toastSeq++ % 1000);
      set((state) => ({
        // Același mesaj de două ori la rând (dublu-click) nu stivuiește toast-uri.
        toasts: [...state.toasts.filter(t => t.message !== message), { id, message, type }].slice(-4),
      }));
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.map(t => (t.id === id ? { ...t, leaving: true } : t)) }));
      }, TOAST_MS - TOAST_EXIT_MS);
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
      }, TOAST_MS);
    },
    removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  };
});
