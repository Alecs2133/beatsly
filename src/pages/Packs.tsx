import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export const Packs: React.FC = () => {
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const [dynamicPacks, setDynamicPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    const fetchSounds = async () => {
      try {
        const { data, error } = await supabase
          .from('sounds')
          .select('tags')
          .eq('status', 'approved');

        if (error) throw error;

        const allTags = (data || []).flatMap((s: any) => s.tags || []);
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

        const generatedPacks = uniqueTags.map((tag, index) => ({
          id: tag,
          title: `${tag.charAt(0).toUpperCase() + tag.slice(1)} Pack`,
          author: 'Community',
          count: tagCounts[tag],
          color: colors[index % colors.length],
          tag: tag
        }));

        setDynamicPacks(generatedPacks);
      } catch (err: any) {
        console.error("Error fetching packs:", err);
        setError(err.message);
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
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>All Packs</h1>
          <p style={{ color: 'var(--text-muted)' }}>Explore all sound categories created by our community.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--accent-secondary)' }}>Loading packs...</p>
        </div>
      ) : error ? (
        <div style={{ color: 'var(--accent-tertiary)', padding: '20px', background: 'rgba(255,0,127,0.1)', borderRadius: '8px' }}>
          <strong>Error loading packs:</strong> {error}
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
                {pack.count} {pack.count === 1 ? 'sound' : 'sounds'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
