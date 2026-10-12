import { useOutletContext } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';

// Separat de Layout.tsx: un fișier care exportă și componente și hook-uri
// strică fast refresh-ul în dev.
export interface LayoutContext {
  user: User | null;
  requestAuth: () => void;
}

/** Pagini (Pricing, Download) citesc user/requestAuth prin acest hook. */
export function useLayoutContext() {
  return useOutletContext<LayoutContext>();
}
