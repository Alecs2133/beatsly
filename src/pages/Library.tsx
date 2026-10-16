import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List } from 'lucide-react';
import { SoundGrid } from '../components/SoundGrid';
import { SoundItem } from '../types/sound';
import { supabase } from '../lib/supabase';
import { fetchAllPages } from '../lib/paging';
import { mapSoundRow } from '../lib/soundRow';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { ALL_KEYS, isHarmonicallyCompatible, parseKey } from '../lib/musicKey';
import { errorMessage } from '../lib/errors';
import { buildTagPacks, TagPack } from '../lib/packs';
import { Icon } from '../components/Icon';
import { PackCard } from '../components/PackCard';
import { Segmented } from '../components/Segmented';
import { SoundGridSkeleton } from '../components/SoundGridSkeleton';
import { CamelotWheel } from '../components/controls/CamelotWheel';
import { Knob } from '../components/controls/Knob';
import { BpmInput } from '../components/controls/BpmInput';
import './Library.css';

/** Fereastra de tempo din jurul valorii potențiometrului. */
const BPM_WINDOW = 6;
// Intervalul potențiometrului și al câmpului scris de mână.
const BPM_MIN = 50;
const BPM_MAX = 220;
const CATEGORIES = ['ALL', 'Loop', 'One-Shot', 'FX'];

export const Library: React.FC = () => {
  const {
    searchQuery, setSearchQuery, soundView, setSoundView,
    discoverKey, setDiscoverKey, discoverBpm, setDiscoverBpm, discoverType, setDiscoverType, clearDiscoverFilters,
  } = useAppStore();
  const { session } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicPacks, setDynamicPacks] = useState<TagPack[]>([]);

  // Reîncărcăm doar când se schimbă userul, nu la fiecare refresh de token
  // (care produce un obiect `session` nou cu același user).
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    const fetchSounds = async () => {
      try {
        const data = await fetchAllPages((from, to) =>
          supabase
            .from('sounds')
            .select('*')
            .eq('status', 'approved')
            // Sunetele de crew sunt private: RLS le arată membrilor, dar
            // locul lor e pe pagina Crew, nu în catalogul public.
            .is('crew_id', null)
            .order('created_at', { ascending: false })
            .order('id')
            .range(from, to)
        );

        const audioFallbacks = ['/audio/bass.wav', '/audio/kick.wav', '/audio/vocal.wav'];
        const mappedData = data.map((item, index) => ({
          ...mapSoundRow(item),
          file_url: item.file_url || audioFallbacks[index % audioFallbacks.length],
        }));
        setSounds(mappedData);
        setDynamicPacks(buildTagPacks(mappedData.map(s => s.tags), 6));
      } catch (err) {
        console.error('Error fetching sounds:', err);
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchSounds();
  }, [userId]);

  const referenceKey = discoverKey == null ? null : ALL_KEYS[discoverKey]?.key ?? null;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sounds.filter(s => {
      const matchesSearch = !q || s.title.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.tags.some(tag => tag.toLowerCase().includes(q));
      const matchesType = discoverType === 'ALL' || s.type.toLowerCase() === discoverType.toLowerCase();
      const matchesBpm = discoverBpm == null || (s.bpm != null && Math.abs(s.bpm - discoverBpm) <= BPM_WINDOW);
      // Cu o tonalitate aleasă, un sunet fără tonalitate parsabilă e exclus —
      // mai bine ascuns decât potrivit greșit.
      const matchesKey = !referenceKey || (() => {
        const candidate = parseKey(s.key);
        return !!candidate && isHarmonicallyCompatible(referenceKey, candidate);
      })();
      return matchesSearch && matchesType && matchesBpm && matchesKey;
    });
  }, [sounds, searchQuery, discoverType, discoverBpm, referenceKey]);

  const hasFilters = !!searchQuery || discoverKey != null || discoverBpm != null || discoverType !== 'ALL';

  if (!session) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Icon name="lock" size={26} play={1} /></div>
        <h2>{t('auth_required')}</h2>
        <p>{t('auth_required_desc')}</p>
        <button className="btn-primary-pill" onClick={() => navigate('/auth')}>{t('sign_in_now')}</button>
      </div>
    );
  }

  return (
    <div className="discover">
      {/* Rack-ul de filtre — controale „fizice” */}
      <aside className="discover-rack">
        <section className="rack-panel">
          <header>
            <h3>{t('rack_key')}</h3>
            {discoverKey != null && <button type="button" onClick={() => setDiscoverKey(null)}>{t('rack_any')}</button>}
          </header>
          <CamelotWheel value={discoverKey} onChange={setDiscoverKey} anyLabel={t('rack_any')} subLabel={t('rack_key_sub')} />
        </section>

        <section className="rack-panel">
          <header>
            <h3>{t('rack_tempo')}</h3>
            {discoverBpm != null && <button type="button" onClick={() => setDiscoverBpm(null)}>{t('rack_any')}</button>}
          </header>
          <div className="rack-knob">
            <Knob min={BPM_MIN} max={BPM_MAX} value={discoverBpm} onChange={setDiscoverBpm} label={t('rack_tempo')} />
            <div>
              <span className="bpm-field">
                <BpmInput value={discoverBpm} onChange={setDiscoverBpm} min={BPM_MIN} max={BPM_MAX} label={t('rack_tempo')} placeholder="—" />
                <small>BPM</small>
              </span>
              <span>
                {discoverBpm == null
                  ? t('rack_drag')
                  : t('rack_window', { min: discoverBpm - BPM_WINDOW, max: discoverBpm + BPM_WINDOW })}
              </span>
            </div>
          </div>
        </section>

        <section className="rack-panel">
          <header><h3>{t('rack_type')}</h3></header>
          <Segmented
            ariaLabel={t('rack_type')}
            value={discoverType}
            onChange={setDiscoverType}
            options={CATEGORIES.map(cat => ({ value: cat, label: cat === 'ALL' ? t('filter_all') : cat }))}
          />
        </section>
      </aside>

      <div className="discover-main">
        <div className="discover-head">
          <div>
            <h1>{t('discover_title')}</h1>
            <p>
              {loading
                ? t('loading_sounds')
                : t(hasFilters ? 'discover_count_filtered' : 'discover_count', { n: filtered.length, total: sounds.length })}
              {hasFilters && (
                <button type="button" className="link-btn inline" onClick={clearDiscoverFilters}>{t('filter_clear')}</button>
              )}
            </p>
          </div>
          <div className="view-toggle" role="group" aria-label={t('settings_view')}>
            <button type="button" aria-pressed={soundView === 'cards'} onClick={() => setSoundView('cards')} title={t('view_cards')}>
              <LayoutGrid size={16} />
            </button>
            <button type="button" aria-pressed={soundView === 'list'} onClick={() => setSoundView('list')} title={t('view_list')}>
              <List size={16} />
            </button>
          </div>
        </div>

        {searchQuery && (
          <div className="search-chip">
            „{searchQuery}”
            <button type="button" onClick={() => setSearchQuery('')} aria-label={t('search_clear')}>×</button>
          </div>
        )}

        {!hasFilters && dynamicPacks.length > 0 && (
          <section className="discover-packs">
            <div className="discover-packs-head">
              <h2 className="section-heading bi-trigger"><Icon name="trend" size={20} play={1} />{t('featured_packs')}</h2>
              <button className="link-btn" onClick={() => navigate('/packs')}>{t('show_all')}</button>
            </div>
            <div className="pack-row">
              {dynamicPacks.map((pack, i) => (
                <PackCard key={pack.id} pack={pack} index={i} compact onOpen={(tag) => navigate(`/pack/${tag}`)} />
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <SoundGridSkeleton />
        ) : error ? (
          <div className="error-box"><strong>{t('error_loading')}</strong> {error}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-inline">
            <p>{t('no_sounds_found')}</p>
            {hasFilters && <button type="button" className="link-btn" onClick={clearDiscoverFilters}>{t('filter_clear')}</button>}
          </div>
        ) : (
          <SoundGrid sounds={filtered} />
        )}
      </div>
    </div>
  );
};
