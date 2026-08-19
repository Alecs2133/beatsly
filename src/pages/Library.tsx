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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const categories = ['ALL', 'Loop', 'One-Shot', 'FX'];

  const [dynamicPacks, setDynamicPacks] = useState<any[]>([]);

  useEffect(() => {
    if (!session) return; // Do not fetch if not logged in

    const fetchSounds = async () => {
      try {
        const { data, error } = await supabase
          .from('sounds')
          .select('*')
          .eq('status', 'approved')
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
          file_url: item.file_url || audioFallbacks[index % audioFallbacks.length],
          preview_url: item.preview_url ?? undefined,
          storage_path: item.storage_path ?? undefined,
          owner_id: item.owner_id ?? undefined
        }));
        setSounds(mappedData);

        // Compute frequencies to show top 5
        const allTags = mappedData.flatMap((s: any) => s.tags || []);
        const tagCounts = allTags.reduce((acc: any, tag: string) => {
           if (tag && tag.trim().length > 0) {
             acc[tag] = (acc[tag] || 0) + 1;
           }
           return acc;
        }, {});
        
        const uniqueTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
        
        const colors = [
          'linear-gradient(135deg, #ff007f, #7928ca)',
          'linear-gradient(135deg, #00c6ff, #0072ff)',
          'linear-gradient(135deg, #fceabb, #f8b500)',
          'linear-gradient(135deg, #11998e, #38ef7d)',
          'linear-gradient(135deg, #ff416c, #ff4b2b)',
          'linear-gradient(135deg, #9d4edd, #ff007f)',
        ];
        // Slice top 5
        const generatedPacks = uniqueTags.slice(0, 5).map((tag, index) => ({
          id: tag,
          title: `${tag.charAt(0).toUpperCase() + tag.slice(1)} Pack`,
          author: 'Community',
          count: tagCounts[tag],
          color: colors[index % colors.length],
          tag: tag
        }));
        setDynamicPacks(generatedPacks);
      } catch (err: any) {
        console.error("Error fetching sounds:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSounds();
  }, [session?.user?.id]);

  // Reset to page 1 when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

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

      {currentPage === 1 && (
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{t('featured_packs')}</h2>
            <button 
              onClick={() => navigate('/packs')}
            style={{ 
              background: 'transparent', border: 'none', color: 'var(--accent-secondary)', 
              fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' 
            }}
          >
            Show All
          </button>
        </div>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', margin: '0 -10px', padding: '0 10px 16px 10px' }}>
          {dynamicPacks.length > 0 ? dynamicPacks.map(pack => (
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
              onClick={() => navigate(`/pack/${pack.tag}`)}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginBottom: '4px' }}>{pack.title}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontWeight: '600' }}>by {pack.author}</p>
            </div>
          )) : (
            <p style={{ color: 'var(--text-muted)' }}>{t('no_sounds_found')}</p>
          )}
        </div>
      </div>
      )}

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
      ) : (() => {
        const filteredSounds = sounds.filter(s => {
          const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesFilter = activeFilter === 'ALL' || s.type.toLowerCase() === activeFilter.toLowerCase();
          return matchesSearch && matchesFilter;
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