import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllPages } from '../lib/paging';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../lib/errors';
import { buildTagPacks, TagPack } from '../lib/packs';
import { useTranslation } from '../hooks/useTranslation';

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
        <div style={{ color: 'var(--accent-tertiary)', padding: '20px', background: 'rgba(255,0,127,0.1)', borderRadius: '8px' }}>
          <strong>{t('packs_load_failed')}</strong> {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {dynamicPacks.map(pack => (
            <div 
              key={pack.id} 
              style={{ 
                height: '140px', 
                borderRadius: '16px', 
                background: pack.color, 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 15px 25px rgba(0,0,0,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
              }}
              onClick={() => navigate(`/pack/${pack.tag}`)}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginBottom: '4px' }}>{pack.title}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontWeight: '600' }}>
                {t(pack.count === 1 ? 'pack_sounds_one' : 'pack_sounds', { count: pack.count })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
