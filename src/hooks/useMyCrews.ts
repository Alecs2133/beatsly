import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Crew, fetchMyCrews } from '../lib/crews';

/**
 * Crew-urile din care userul curent face parte. Folosit atât pentru pagina
 * Crew, cât și pentru a decide dacă link-ul din Sidebar apare — un membru
 * invitat pe Free trebuie să-l vadă la fel ca proprietarul Ultimate.
 */
export function useMyCrews() {
  const user = useAuthStore(state => state.user);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setCrews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCrews(await fetchMyCrews());
    } catch (err) {
      console.error('Failed to load crews:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { crews, loading, refetch };
}
