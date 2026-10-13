import { useOutletContext } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';

// Separat de Layout.tsx: un fișier care exportă și componente și hook-uri
// strică fast refresh-ul în dev.
export interface LayoutContext {
  user: User | null;
  /** `false` cât timp sesiunea încă se citește — `user === null` nu înseamnă încă „nelogat”. */
  authReady: boolean;
  requestAuth: () => void;
}

/** Pagini (Pricing, Download) citesc user/requestAuth prin acest hook. */
export function useLayoutContext() {
  return useOutletContext<LayoutContext>();
}
