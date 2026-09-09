import React, { useEffect, useState } from 'react';
import { Plus, Folder } from 'lucide-react';
import { SoundGrid } from '../components/SoundGrid';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { useCollections } from '../hooks/useCollections';
import { createCollection, deleteCollection, fetchCollectionSoundIds } from '../lib/collections';
import { supabase } from '../lib/supabase';
import { SoundItem } from '../data/mockData';

export const MySounds: React.FC = () => {
  const { savedSounds } = useLibraryStore();
  const { searchQuery, showToast } = useAppStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const { collections, refetch: refetchCollections } = useCollections();
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [collectionSounds, setCollectionSounds] = useState<SoundItem[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const categories = ['ALL', 'Loop', 'One-Shot', 'FX'];

  useEffect(() => {
    if (!activeCollectionId) {
      setCollectionSounds([]);
      return;
    }
    let cancelled = false;
    setLoadingCollection(true);
    (async () => {
      try {
        const ids = await fetchCollectionSoundIds(activeCollectionId);
        if (ids.length === 0) {
          if (!cancelled) setCollectionSounds([]);
          return;
        }
        const { data, error } = await supabase.from('sounds').select('*').in('id', ids);
        if (error) throw error;
        const mapped: SoundItem[] = (data ?? []).map((item: any) => ({
          id: item.id,
          title: item.title,
          author: item.author,
          bpm: item.bpm,
          key: item.key_signature,
          tags: item.tags || [],
          duration: item.duration || '0:00',
          type: item.type,
          file_url: item.file_url,
          preview_url: item.preview_url ?? undefined,
          storage_path: item.storage_path ?? undefined,
          owner_id: item.owner_id ?? undefined,
          license: item.license,
        }));
        if (!cancelled) setCollectionSounds(mapped);
      } catch (err: any) {
        console.error('Failed to load collection:', err);
        showToast('Failed to load collection: ' + err.message, 'error');
      } finally {
        if (!cancelled) setLoadingCollection(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeCollectionId, showToast]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    try {
      const collection = await createCollection(newCollectionName.trim());
      setNewCollectionName('');
      await refetchCollections();
      setActiveCollectionId(collection.id);
    } catch (err: any) {
      showToast('Failed to create collection: ' + err.message, 'error');
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!window.confirm('Delete this collection? The sounds themselves are not affected.')) return;
    try {
      await deleteCollection(collectionId);
      if (activeCollectionId === collectionId) setActiveCollectionId(null);
      await refetchCollections();
    } catch (err: any) {
      showToast('Failed to delete collection: ' + err.message, 'error');
    }
  };

  const baseSounds = activeCollectionId ? collectionSounds : savedSounds;

  const filteredSounds = baseSounds.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = activeFilter === 'ALL' || s.type.toLowerCase() === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="library-page">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>{t('my_sounds_title')}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{t('my_sounds_subtitle')}</p>
      </div>

      <div className="filter-container" style={{ marginBottom: 12 }}>
        <button
          className={`filter-btn ${activeCollectionId === null ? 'active' : ''}`}
          onClick={() => setActiveCollectionId(null)}
        >
          {t('collections_saved')}
        </button>
        {collections.map(c => (
          <button
            key={c.id}
            className={`filter-btn ${activeCollectionId === c.id ? 'active' : ''}`}
            onClick={() => setActiveCollectionId(c.id)}
            onDoubleClick={() => handleDeleteCollection(c.id)}
            title={t('collections_delete_hint')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Folder size={13} /> {c.name}
          </button>
        ))}
        <form onSubmit={handleCreateCollection} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            value={newCollectionName}
            onChange={e => setNewCollectionName(e.target.value)}
            placeholder={t('collections_new_placeholder')}
            style={{ padding: '6px 10px', borderRadius: 16, border: '1px solid var(--border-strong)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', fontSize: 12, width: 140 }}
          />
          <button type="submit" className="filter-btn" style={{ display: 'flex', alignItems: 'center' }} title={t('collections_new_placeholder')}>
            <Plus size={14} />
          </button>
        </form>
      </div>

      <div className="filter-container">
        {categories.map(cat => (
          <button
            key={cat}
            className={`filter-btn ${activeFilter === cat ? 'active' : ''}`}
            onClick={() => setActiveFilter(cat)}
          >
            {cat === 'ALL' ? t('filter_all') : cat}
          </button>
        ))}
      </div>

      {loadingCollection ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--accent-secondary)' }}>Loading…</div>
      ) : filteredSounds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎧</div>
          <h2 style={{ color: 'white', marginBottom: '12px' }}>{t('no_saved_sounds')}</h2>
          <button 
            onClick={() => navigate('/')}
            style={{
              background: 'var(--gradient-primary)',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '16px'
            }}
          >
            {t('explore_discover')}
          </button>
        </div>
      ) : (
        <SoundGrid sounds={filteredSounds} />
      )}
    </div>
  );
};
