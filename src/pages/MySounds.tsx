import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Plus, Trash2 } from 'lucide-react';
import { SoundGrid } from '../components/SoundGrid';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../hooks/useTranslation';
import { useCollections } from '../hooks/useCollections';
import { createCollection, deleteCollection, fetchCollectionSoundIds } from '../lib/collections';
import { supabase } from '../lib/supabase';
import { SoundItem } from '../types/sound';
import { mapSoundRow } from '../lib/soundRow';
import { fetchAllPages, fetchByIdChunks } from '../lib/paging';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { SoundGridSkeleton } from '../components/SoundGridSkeleton';
import { errorMessage } from '../lib/errors';
import './MySounds.css';

const SAVED = 'saved';
const CATEGORIES = ['ALL', 'Loop', 'One-Shot', 'FX'];
// Nuanțe pentru lăzi, prin rotație — fiecare colecție își păstrează culoarea.
const CRATE_HUES = [262, 205, 330, 30, 160, 290, 15, 185];
// Banda de pe ladă nu e lipită niciodată perfect drept.
const TAPE_TILT = [-2.4, 1.6, -0.8, 2.2, -1.7, 0.9, -2.9, 1.2];

/** Barele decorative de pe o ladă — fixe pe index, ca să nu „sară” la randare. */
function CrateBars({ seed }: { seed: number }) {
  return (
    <span className="crate-bars" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} style={{ height: `${30 + ((seed * 13 + i * 29) % 70)}%`, animationDelay: `${-i * 0.08}s` }} />
      ))}
    </span>
  );
}

/**
 * Sunetele mele: colecțiile ca lăzi cu viniluri. Treci peste o ladă și se
 * răsfiră; click o deschide.
 */
export const MySounds: React.FC = () => {
  const { savedSounds } = useLibraryStore();
  const { searchQuery, showToast } = useAppStore();
  const playQueue = usePlayerStore(s => s.playQueue);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { collections, refetch: refetchCollections } = useCollections();
  const [openCrate, setOpenCrate] = useState<string | null>(null);
  const [crateSounds, setCrateSounds] = useState<SoundItem[]>([]);
  const [loadingCrate, setLoadingCrate] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Câte sunete are fiecare ladă — un singur query pentru toate colecțiile.
  useEffect(() => {
    if (collections.length === 0) {
      setCounts({});
      return;
    }
    const ids = collections.map(c => c.id);
    fetchAllPages((from, to) =>
      supabase.from('collection_sounds').select('collection_id').in('collection_id', ids).order('collection_id').range(from, to)
    )
      .then(rows => {
        const next: Record<string, number> = {};
        rows.forEach(r => { next[r.collection_id] = (next[r.collection_id] ?? 0) + 1; });
        setCounts(next);
      })
      .catch(err => console.error('Failed to count collection sounds:', err));
  }, [collections]);

  useEffect(() => {
    if (!openCrate || openCrate === SAVED) {
      setCrateSounds([]);
      return;
    }
    let cancelled = false;
    setLoadingCrate(true);
    (async () => {
      try {
        const ids = await fetchCollectionSoundIds(openCrate);
        const rows = ids.length
          ? await fetchByIdChunks(ids, chunk => supabase.from('sounds').select('*').in('id', chunk))
          : [];
        // Păstrăm ordinea din colecție (cel mai recent adăugat primul).
        const byId = new Map(rows.map(row => [row.id, row]));
        const ordered = ids.flatMap(id => {
          const row = byId.get(id);
          return row ? [mapSoundRow(row)] : [];
        });
        if (!cancelled) setCrateSounds(ordered);
      } catch (err) {
        console.error('Failed to load collection:', err);
        showToast(`${t('collections_load_failed')} ${errorMessage(err)}`, 'error');
      } finally {
        if (!cancelled) setLoadingCrate(false);
      }
    })();
    return () => { cancelled = true; };
  }, [openCrate, showToast, t]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const collection = await createCollection(newName.trim());
      setNewName('');
      setCreating(false);
      await refetchCollections();
      setOpenCrate(collection.id);
    } catch (err) {
      showToast(`${t('grid_create_failed')} ${errorMessage(err)}`, 'error');
    }
  };

  const handleDelete = async (collectionId: string) => {
    if (!window.confirm(t('collections_delete_confirm'))) return;
    try {
      await deleteCollection(collectionId);
      setOpenCrate(null);
      await refetchCollections();
    } catch (err) {
      showToast(`${t('collections_delete_failed')} ${errorMessage(err)}`, 'error');
    }
  };

  const baseSounds = openCrate === SAVED ? savedSounds : crateSounds;
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return baseSounds.filter(s =>
      (!q || s.title.toLowerCase().includes(q) || s.author.toLowerCase().includes(q) || s.tags.some(tag => tag.toLowerCase().includes(q))) &&
      (typeFilter === 'ALL' || s.type.toLowerCase() === typeFilter.toLowerCase())
    );
  }, [baseSounds, searchQuery, typeFilter]);

  const countLabel = (n: number) =>
    n === 0 ? t('crate_sounds_none') : n === 1 ? t('crate_sounds_one') : t('crate_sounds', { count: n });

  // ---------- Lada deschisă ----------
  if (openCrate) {
    const collection = collections.find(c => c.id === openCrate);
    const title = openCrate === SAVED ? t('crate_all') : collection?.name ?? '';
    return (
      <div className="crate-open">
        <button type="button" className="back-link" onClick={() => { setOpenCrate(null); setTypeFilter('ALL'); }}>
          <ChevronLeft size={16} /> {t('crate_back')}
        </button>
        <div className="crate-open-head">
          <div>
            <h1>{title}</h1>
            <p>{countLabel(baseSounds.length)}</p>
          </div>
          <div className="crate-open-actions">
            <Segmented
              ariaLabel={t('rack_type')}
              value={typeFilter}
              onChange={setTypeFilter}
              options={CATEGORIES.map(cat => ({ value: cat, label: cat === 'ALL' ? t('filter_all') : cat }))}
            />
            <button
              type="button"
              className="btn-primary-pill"
              disabled={filtered.length === 0}
              onClick={() => playQueue(filtered, 0)}
            >
              <Play size={15} fill="currentColor" /> {t('crate_play')}
            </button>
            {collection && (
              <button type="button" className="btn-danger-pill" onClick={() => handleDelete(collection.id)} title={t('crate_delete')}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {loadingCrate ? (
          <SoundGridSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <div className="empty-inline">
            <div className="empty-icon"><Icon name="heart" size={26} play={1} /></div>
            <p>{openCrate === SAVED ? t('no_saved_sounds') : t('crate_empty')}</p>
            <button type="button" className="btn-primary-pill" onClick={() => navigate('/')}>{t('explore_discover')}</button>
          </div>
        ) : (
          <SoundGrid sounds={filtered} />
        )}
      </div>
    );
  }

  // ---------- Lăzile ----------
  const crates = [
    { id: SAVED, name: t('crate_all'), count: savedSounds.length },
    ...collections.map(c => ({ id: c.id, name: c.name, count: counts[c.id] ?? 0 })),
  ];

  return (
    <div className="crates-page">
      <div className="crates-head">
        <h1>{t('my_sounds_title')}</h1>
        <p>{t('crates_subtitle')}</p>
      </div>

      <div className="crates">
        {crates.map((crate, i) => (
          <button
            key={crate.id}
            type="button"
            className="crate"
            style={{ '--h': CRATE_HUES[i % CRATE_HUES.length], '--i': i } as React.CSSProperties}
            onClick={() => setOpenCrate(crate.id)}
          >
            <span className="crate-slab" />
            <span className="crate-slab" />
            <span className="crate-slab front">
              <CrateBars seed={i + 1} />
              <span className="num">{countLabel(crate.count)}</span>
            </span>
            <span className="crate-lip">
              <span className="crate-tape" style={{ '--r': `${TAPE_TILT[i % TAPE_TILT.length]}deg` } as React.CSSProperties} title={crate.name}>
                {crate.name}
              </span>
              <span className="crate-no num">{String(i + 1).padStart(2, '0')}</span>
            </span>
          </button>
        ))}

        {creating ? (
          <form className="crate crate-new editing" style={{ '--i': crates.length } as React.CSSProperties} onSubmit={handleCreate}>
            <span className="crate-slab front">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t('collections_new_placeholder')}
                onBlur={() => { if (!newName.trim()) setCreating(false); }}
                onKeyDown={e => { if (e.key === 'Escape') setCreating(false); }}
              />
              <button type="submit" className="btn-primary-pill">{t('grid_create')}</button>
            </span>
            <span className="crate-lip"><span className="crate-tape blank" style={{ '--r': '-1deg' } as React.CSSProperties}>{newName || t('crate_new')}</span><span className="crate-no num">{String(crates.length + 1).padStart(2, '0')}</span></span>
          </form>
        ) : (
          <button
            type="button"
            className="crate crate-new"
            style={{ '--i': crates.length } as React.CSSProperties}
            onClick={() => setCreating(true)}
          >
            <span className="crate-slab front" aria-label={t('crate_new')}><Plus size={26} /></span>
            <span className="crate-lip"><span className="crate-tape blank" style={{ '--r': '-1deg' } as React.CSSProperties}>{newName || t('crate_new')}</span><span className="crate-no num">{String(crates.length + 1).padStart(2, '0')}</span></span>
          </button>
        )}
      </div>
    </div>
  );
};
