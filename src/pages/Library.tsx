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
import { ALL_KEYS, keyMatchesFilter } from '../lib/musicKey';
import { errorMessage } from '../lib/errors';
import { buildTagPacks, TagPack } from '../lib/packs';
import { Icon } from '../components/Icon';
import { PackCard } from '../components/PackCard';
import { Segmented } from '../components/Segmented';
import { SoundGridSkeleton } from '../components/SoundGridSkeleton';
import { CamelotWheel } from '../components/controls/CamelotWheel';
import { Knob } from '../components/controls/Knob';
import { BpmInput } from '../components/controls/BpmInput';
import { HelpTip } from '../components/HelpTip';
import './Library.css';

// Intervalul potențiometrului și al câmpului scris de mână.
const BPM_MIN = 50;
const BPM_MAX = 220;
const CATEGORIES = ['ALL', 'Loop', 'One-Shot', 'FX'];

export const Library: React.FC = () => {
  const {
    searchQuery, setSearchQuery, soundView, setSoundView,
    discoverKey, setDiscoverKey, discoverBpmMin, discoverBpmMax, setDiscoverBpmRange, discoverType, setDiscoverType, clearDiscoverFilters,
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
            // Sunetele rămase din fostele crew-uri sunt private — nu intră în catalog.
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

  const bpmActive = discoverBpmMin != null || discoverBpmMax != null;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sounds.filter(s => {
      const matchesSearch = !q || s.title.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.tags.some(tag => tag.toLowerCase().includes(q));
      const matchesType = discoverType === 'ALL' || s.type.toLowerCase() === discoverType.toLowerCase();
      // Cu un interval ales, un sunet fără BPM e exclus.
      const matchesBpm = !bpmActive || (s.bpm != null &&
        (discoverBpmMin == null || s.bpm >= discoverBpmMin) &&
        (discoverBpmMax == null || s.bpm <= discoverBpmMax));
      // Cu o tonalitate aleasă, un sunet fără tonalitate parsabilă e exclus —
      // mai bine ascuns decât potrivit greșit. Doar nota („C”) = major sau minor.
      const matchesKey = !referenceKey || keyMatchesFilter(referenceKey, s.key);
      return matchesSearch && matchesType && matchesBpm && matchesKey;
    });
  }, [sounds, searchQuery, discoverType, discoverBpmMin, discoverBpmMax, bpmActive, referenceKey]);

  const hasFilters = !!searchQuery || discoverKey != null || bpmActive || discoverType !== 'ALL';

  // Capetele nu se pot încrucișa: cel mutat îl împinge pe celălalt.
  const setBpmMin = (v: number | null) =>
    setDiscoverBpmRange(v, v != null && discoverBpmMax != null && v > discoverBpmMax ? v : discoverBpmMax);
  const setBpmMax = (v: number | null) =>
    setDiscoverBpmRange(v != null && discoverBpmMin != null && v < discoverBpmMin ? v : discoverBpmMin, v);
  const lo = discoverBpmMin ?? BPM_MIN;
  const hi = discoverBpmMax ?? BPM_MAX;
  const pct = (v: number) => ((v - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 100;
  const bpmSummary =
    discoverBpmMin != null && discoverBpmMax != null
      ? t('rack_bpm_between', { min: discoverBpmMin, max: discoverBpmMax })
      : discoverBpmMin != null
        ? t('rack_bpm_from', { min: discoverBpmMin })
        : discoverBpmMax != null
          ? t('rack_bpm_to', { max: discoverBpmMax })
          : t('rack_drag');

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
            {bpmActive && <button type="button" onClick={() => setDiscoverBpmRange(null, null)}>{t('rack_any')}</button>}
          </header>
          <div className="rack-range">
            <div className="rack-end">
              <span className="rack-end-label">{t('rack_bpm_min')}</span>
              <Knob
                min={BPM_MIN}
                max={BPM_MAX}
                value={discoverBpmMin}
                onChange={setBpmMin}
                size={58}
                startAt={discoverBpmMax != null ? Math.max(BPM_MIN, discoverBpmMax - 20) : 90}
                label={t('rack_bpm_min')}
              />
              <BpmInput value={discoverBpmMin} onChange={setBpmMin} min={BPM_MIN} max={BPM_MAX} label={t('rack_bpm_min')} placeholder="—" />
            </div>
            <span className="rack-range-dash" aria-hidden>–</span>
            <div className="rack-end">
              <span className="rack-end-label">{t('rack_bpm_max')}</span>
              <Knob
                min={BPM_MIN}
                max={BPM_MAX}
                value={discoverBpmMax}
                onChange={setBpmMax}
                size={58}
                startAt={discoverBpmMin != null ? Math.min(BPM_MAX, discoverBpmMin + 20) : 150}
                label={t('rack_bpm_max')}
              />
              <BpmInput value={discoverBpmMax} onChange={setBpmMax} min={BPM_MIN} max={BPM_MAX} label={t('rack_bpm_max')} placeholder="—" />
            </div>
          </div>
          <div className={`rack-range-bar${bpmActive ? ' on' : ''}`} aria-hidden>
            <i style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
          </div>
          <p className="rack-range-note">{bpmSummary}</p>
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
          <div className="discover-tools">
          <HelpTip />
          <div className="view-toggle" role="group" aria-label={t('settings_view')}>
            <button type="button" aria-pressed={soundView === 'cards'} onClick={() => setSoundView('cards')} title={t('view_cards')}>
              <LayoutGrid size={16} />
            </button>
            <button type="button" aria-pressed={soundView === 'list'} onClick={() => setSoundView('list')} title={t('view_list')}>
              <List size={16} />
            </button>
          </div>
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
