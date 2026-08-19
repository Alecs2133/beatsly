import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

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
    const id = Date.now();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
}));
