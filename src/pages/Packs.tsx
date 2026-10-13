import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllPages } from '../lib/paging';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../lib/errors';
import { buildTagPacks, TagPack } from '../lib/packs';
import { useTranslation } from '../hooks/useTranslation';
import { PackCard } from '../components/PackCard';

export const Packs: React.FC = () => {
  const { session } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dynamicPacks, setDynamicPacks] = useState<TagPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    const fetchSounds = async () => {
      try {
        const data = await fetchAllPages((from, to) =>
          supabase
            .from('sounds')
            .select('tags')
            .eq('status', 'approved')
            .is('crew_id', null)
            .order('id')
            .range(from, to)
        );

        setDynamicPacks(buildTagPacks(data.map(s => s.tags)));
      } catch (err) {
        console.error("Error fetching packs:", err);
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchSounds();
  }, [session]);

  if (!session) return null;

  return (
    <div className="library-page" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
          &larr;
        </button>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>{t('packs_title')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('packs_subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--accent-secondary)' }}>{t('packs_loading')}</p>
        </div>
      ) : error ? (
        <div style={{ color: 'var(--accent-tertiary)', padding: '20px', background: 'rgba(248, 113, 113,0.1)', borderRadius: '8px' }}>
          <strong>{t('packs_load_failed')}</strong> {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {dynamicPacks.map((pack, i) => (
            <PackCard key={pack.id} pack={pack} index={i} onOpen={(tag) => navigate(`/pack/${tag}`)} />
          ))}
        </div>
      )}
    </div>
  );
};
