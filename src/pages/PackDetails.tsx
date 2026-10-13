import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchAllPages } from '../lib/paging';
import { SoundGrid } from '../components/SoundGrid';
import { SoundItem } from '../types/sound';
import { mapSoundRow } from '../lib/soundRow';
import { useAuthStore } from '../store/useAuthStore';
import { errorMessage } from '../lib/errors';
import { useTranslation } from '../hooks/useTranslation';
import { SoundGridSkeleton } from '../components/SoundGridSkeleton';

export const PackDetails: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const { session } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !tag) return;

    const fetchSounds = async () => {
      try {
        const data = await fetchAllPages((from, to) =>
          supabase
            .from('sounds')
            .select('*')
            .eq('status', 'approved')
            .is('crew_id', null)
            .contains('tags', [tag])
            .order('created_at', { ascending: false })
            .order('id')
            .range(from, to)
        );

        const audioFallbacks = ['/audio/bass.wav', '/audio/kick.wav', '/audio/vocal.wav'];
        const mappedData = (data || []).map((item, index) => ({
          ...mapSoundRow(item),
          file_url: item.file_url || audioFallbacks[index % audioFallbacks.length],
        }));

        setSounds(mappedData);
      } catch (err) {
        console.error("Error fetching pack sounds:", err);
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchSounds();
  }, [session, tag]);

  if (!session) return null;

  return (
    <div className="library-page" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
          &larr;
        </button>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', textTransform: 'capitalize' }}>
            {t('pack_title', { tag: tag ?? '' })}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>{t(sounds.length === 1 ? 'pack_count_one' : 'pack_count', { count: sounds.length })}</p>
        </div>
      </div>

      {loading ? (
        <SoundGridSkeleton />
      ) : error ? (
        <div style={{ color: 'var(--accent-tertiary)', padding: '20px', background: 'rgba(248, 113, 113,0.1)', borderRadius: '8px' }}>
          <strong>{t('pack_load_failed')}</strong> {error}
        </div>
      ) : sounds.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>{t('pack_empty')}</p>
        </div>
      ) : (
        <SoundGrid sounds={sounds} />
      )}
    </div>
  );
};
