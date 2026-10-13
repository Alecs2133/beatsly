import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  /** Ultimele 250ms: rulează animația de ieșire înainte de a dispărea. */
  leaving?: boolean;
}

const TOAST_MS = 3000;
const TOAST_EXIT_MS = 250;
// Același mesaj de două ori la rând (dublu-click) nu mai stivuiește toast-uri.
let toastSeq = 0;

interface AppState {
  // NOTĂ: creditele NU stau aici. Sursa unică de adevăr este
  // `useAuthStore.profile.credits`, sincronizat cu baza de date.
  // Consumul se face prin `useAuthStore.deductCredit()` (RPC server-side).

  // --- Search ---
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // --- Localization ---
  language: 'en' | 'ro';
  setLanguage: (lang: 'en' | 'ro') => void;

  // --- Toasts ---
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  toasts: [],
  showToast: (message, type = 'info') => {
    const id = Date.now() * 1000 + (toastSeq++ % 1000);
    set((state) => ({
      toasts: [...state.toasts.filter(t => t.message !== message), { id, message, type }].slice(-4),
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.map(t => (t.id === id ? { ...t, leaving: true } : t)) }));
    }, TOAST_MS - TOAST_EXIT_MS);
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, TOAST_MS);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
}));
