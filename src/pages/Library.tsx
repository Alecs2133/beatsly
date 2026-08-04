import React, { useEffect, useState } from 'react';
import { SoundGrid } from '../components/SoundGrid';
import { SoundItem } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

export const Library: React.FC = () => {
  const { searchQuery } = useAppStore();
  const { session } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const categories = ['ALL', 'Loop', 'One-Shot', 'FX'];

  const curatedPacks = [
    { id: 1, title: 'Hip-Hop Essentials', author: 'Beats.ly', color: 'linear-gradient(135deg, #ff007f, #7928ca)', tag: 'hip-hop' },
    { id: 2, title: 'Cinematic Ambience', author: 'SoundDesign Pro', color: 'linear-gradient(135deg, #00c6ff, #0072ff)', tag: 'cinematic' },
    { id: 3, title: 'Ultimate FX Pack', author: 'Beats.ly', color: 'linear-gradient(135deg, #fceabb, #f8b500)', tag: 'fx' },
    { id: 4, title: 'Lo-Fi Chill Vibes', author: 'ChillBeats', color: 'linear-gradient(135deg, #11998e, #38ef7d)', tag: 'lofi' },
    { id: 5, title: 'Trap God Drums', author: 'Producer X', color: 'linear-gradient(135deg, #ff416c, #ff4b2b)', tag: 'trap' },
  ];

  useEffect(() => {
    if (!session) return; // Do not fetch if not logged in

    const fetchSounds = async () => {
      try {
        const { data, error } = await supabase
          .from('sounds')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Map database columns to our React properties
        const audioFallbacks = ['/audio/bass.wav', '/audio/kick.wav', '/audio/vocal.wav'];

        const mappedData = data.map((item, index) => ({
          id: item.id,
          title: item.title,
          author: item.author,
          bpm: item.bpm,
          key: item.key_signature,
          tags: item.tags || [],
          duration: item.duration || '0:00',
          type: item.type,
          file_url: item.file_url || audioFallbacks[index % audioFallbacks.length]
        }));

        setSounds(mappedData);
      } catch (err: any) {
        console.error("Error fetching sounds:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSounds();
  }, [session?.user?.id]);

  if (!session) {
    return (
      <div className="library-page glass" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '16px', margin: '40px auto', maxWidth: '600px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
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

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>{t('featured_packs')}</h2>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', margin: '0 -10px', padding: '0 10px 16px 10px' }}>
          {curatedPacks.map(pack => (
            <div 
              key={pack.id} 
              style={{ 
                minWidth: '220px', 
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
              onClick={() => {
                useAppStore.getState().setSearchQuery(pack.tag);
                setActiveFilter('ALL');
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginBottom: '4px' }}>{pack.title}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontWeight: '600' }}>by {pack.author}</p>
            </div>
          ))}
        </div>
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--accent-secondary)' }}>{t('loading_sounds')}</p>
        </div>
      ) : error ? (
        <div style={{ color: 'var(--accent-tertiary)', padding: '20px', background: 'rgba(255,0,127,0.1)', borderRadius: '8px' }}>
          <strong>{t('error_loading')}</strong> {error}
        </div>
      ) : sounds.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>{t('no_sounds_found')}</p>
        </div>
      ) : (
        <SoundGrid sounds={sounds.filter(s => {
          const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesFilter = activeFilter === 'ALL' || s.type.toLowerCase() === activeFilter.toLowerCase();
          return matchesSearch && matchesFilter;
        })} />
      )}
    </div>
  );
};