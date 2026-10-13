import React, { useEffect, useState } from 'react';
import { SoundGrid } from '../components/SoundGrid';
import { SoundItem } from '../types/sound';
import { supabase } from '../lib/supabase';
import { fetchAllPages } from '../lib/paging';
import { mapSoundRow } from '../lib/soundRow';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { ALL_KEYS, isHarmonicallyCompatible, parseKey } from '../lib/musicKey';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { errorMessage } from '../lib/errors';
import { buildTagPacks, TagPack } from '../lib/packs';
import { Icon } from '../components/Icon';
import { PackCard } from '../components/PackCard';
import { Segmented } from '../components/Segmented';
import { SoundGridSkeleton } from '../components/SoundGridSkeleton';

export const Library: React.FC = () => {
  const { searchQuery } = useAppStore();
  const { session } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Filtre avansate: interval de BPM + compatibilitate armonică de
  // tonalitate (regula Camelot). Ascunse implicit sub un toggle, ca pagina
  // să rămână simplă pentru cine doar răsfoiește.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');
  const [keyFilterIndex, setKeyFilterIndex] = useState('');
  const referenceKey = keyFilterIndex === '' ? null : ALL_KEYS[Number(keyFilterIndex)].key;

  const categories = ['ALL', 'Loop', 'One-Shot', 'FX'];

  const [dynamicPacks, setDynamicPacks] = useState<TagPack[]>([]);

  // Reîncărcăm doar când se schimbă userul, nu la fiecare refresh de token
  // (care produce un obiect `session` nou cu același user).
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return; // Do not fetch if not logged in

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

        // Map database columns to our React properties
        const audioFallbacks = ['/audio/bass.wav', '/audio/kick.wav', '/audio/vocal.wav'];

        const mappedData = data.map((item, index) => ({
          ...mapSoundRow(item),
          file_url: item.file_url || audioFallbacks[index % audioFallbacks.length],
        }));
        setSounds(mappedData);

        // Top 5 tag-uri ca „Featured Packs”
        setDynamicPacks(buildTagPacks(mappedData.map(s => s.tags), 5));
      } catch (err) {
        console.error("Error fetching sounds:", err);
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchSounds();
  }, [userId]);

  // Reset to page 1 when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, bpmMin, bpmMax, keyFilterIndex]);

  if (!session) {
    return (
      <div className="library-page glass" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '16px', margin: '40px auto', maxWidth: '600px' }}>
        <div className="empty-icon"><Icon name="lock" size={26} play={1} /></div>
        <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>{t('auth_required')}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', margin: '0 auto 32px' }}>
          {t('auth_required_desc')}
        </p>
        <button
          onClick={() => navigate('/auth')}
          style={{
            background: 'var(--gradient-primary)',
            color: 'white',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-glow)',
            transition: 'all 0.3s'
          }}
        >
          {t('sign_in_now')}
        </button>
      </div>
    );
  }

  return (
    <div className="library-page">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>{t('discover_title')}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{t('discover_subtitle')}</p>
      </div>

      {currentPage === 1 && (
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="section-heading bi-trigger"><Icon name="trend" size={20} play={1} />{t('featured_packs')}</h2>
            <button className="link-btn" onClick={() => navigate('/packs')}>
            {t('show_all')}
          </button>
        </div>
        <div className="pack-row">
          {dynamicPacks.length > 0 ? dynamicPacks.map((pack, i) => (
            <PackCard key={pack.id} pack={pack} index={i} compact onOpen={(tag) => navigate(`/pack/${tag}`)} />
          )) : (
            <p style={{ color: 'var(--text-muted)' }}>{t('no_sounds_found')}</p>
          )}
        </div>
      </div>
      )}

      <div className="filter-container" style={{ alignItems: 'center' }}>
        <Segmented
          ariaLabel={t('type_label')}
          value={activeFilter}
          onChange={setActiveFilter}
          options={categories.map(cat => ({ value: cat, label: cat === 'ALL' ? t('filter_all') : cat }))}
        />
        <button
          className={`filter-btn filters-toggle${(bpmMin || bpmMax || referenceKey) ? ' active' : ''}`}
          onClick={() => setShowAdvanced(v => !v)}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal size={14} />
          {t('filters')}
          <ChevronDown size={14} className={`chevron${showAdvanced ? ' open' : ''}`} />
        </button>
      </div>

      {showAdvanced && (
        <div className="filters-panel">
          <div>
            <label className="field-label">
              {t('filter_bpm_range')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number" placeholder={t('filter_min')} value={bpmMin}
                onChange={e => setBpmMin(e.target.value)}
                className="field num" style={{ width: 84 }}
              />
              <span style={{ color: 'var(--text-muted)' }}>–</span>
              <input
                type="number" placeholder={t('filter_max')} value={bpmMax}
                onChange={e => setBpmMax(e.target.value)}
                className="field num" style={{ width: 84 }}
              />
            </div>
          </div>

          <div>
            <label className="field-label">
              {t('filter_harmonic')}
            </label>
            <select
              value={keyFilterIndex}
              onChange={e => setKeyFilterIndex(e.target.value)}
              className="field" style={{ minWidth: 150 }}
            >
              <option value="">{t('filter_any_key')}</option>
              {ALL_KEYS.map((k, i) => (
                <option key={k.label} value={i}>{k.label}</option>
              ))}
            </select>
          </div>

          {(bpmMin || bpmMax || referenceKey) && (
            <button
              onClick={() => { setBpmMin(''); setBpmMax(''); setKeyFilterIndex(''); }}
              className="link-btn"
            >
              {t('filter_clear')}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <SoundGridSkeleton />
      ) : error ? (
        <div style={{ color: 'var(--accent-tertiary)', padding: '20px', background: 'rgba(248, 113, 113,0.1)', borderRadius: '8px' }}>
          <strong>{t('error_loading')}</strong> {error}
        </div>
      ) : sounds.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>{t('no_sounds_found')}</p>
        </div>
      ) : (() => {
        const minBpm = bpmMin ? Number(bpmMin) : null;
        const maxBpm = bpmMax ? Number(bpmMax) : null;

        const filteredSounds = sounds.filter(s => {
          const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesFilter = activeFilter === 'ALL' || s.type.toLowerCase() === activeFilter.toLowerCase();

          const matchesBpm =
            (minBpm === null || (s.bpm !== null && s.bpm >= minBpm)) &&
            (maxBpm === null || (s.bpm !== null && s.bpm <= maxBpm));

          // Fără tonalitate de referință selectată, orice sunet trece.
          // Cu una selectată, un sunet fără tonalitate parsabilă (lipsă sau
          // format necunoscut) e exclus — mai bine ascuns decât potrivit greșit.
          const matchesKey =
            !referenceKey ||
            (() => {
              const candidateKey = parseKey(s.key);
              return !!candidateKey && isHarmonicallyCompatible(referenceKey, candidateKey);
            })();

          return matchesSearch && matchesFilter && matchesBpm && matchesKey;
        });

        const totalPages = Math.ceil(filteredSounds.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const currentSounds = filteredSounds.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return (
          <>
            <SoundGrid sounds={currentSounds} />
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px', paddingBottom: '40px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-strong)',
                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Prev
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      background: currentPage === page ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                      color: currentPage === page ? 'black' : 'var(--text-main)',
                      border: '1px solid',
                      borderColor: currentPage === page ? 'var(--accent-primary)' : 'var(--border-strong)',
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-strong)',
                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};