import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Collection, fetchMyCollections } from '../lib/collections';

/** Colecțiile userului curent — folosit de My Sounds și de dropdown-ul "Add to collection". */
export function useCollections() {
  const user = useAuthStore(state => state.user);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setCollections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCollections(await fetchMyCollections());
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { collections, loading, refetch };
}
