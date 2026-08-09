import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SoundGrid } from '../components/SoundGrid';
import { SoundItem } from '../data/mockData';
import { useAuthStore } from '../store/useAuthStore';

export const PackDetails: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !tag) return;

    const fetchSounds = async () => {
      try {
        const { data, error } = await supabase
          .from('sounds')
          .select('*')
          .eq('status', 'approved')
          .contains('tags', [tag])
          .order('created_at', { ascending: false });

        if (error) throw error;

        const audioFallbacks = ['/audio/bass.wav', '/audio/kick.wav', '/audio/vocal.wav'];
        const mappedData = (data || []).map((item, index) => ({
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
        console.error("Error fetching pack sounds:", err);
        setError(err.message);
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
            {tag} Pack
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>{sounds.length} {sounds.length === 1 ? 'sound' : 'sounds'} in this collection.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--accent-secondary)' }}>Loading sounds...</p>
        </div>
      ) : error ? (
        <div style={{ color: 'var(--accent-tertiary)', padding: '20px', background: 'rgba(255,0,127,0.1)', borderRadius: '8px' }}>
          <strong>Error loading pack:</strong> {error}
        </div>
      ) : sounds.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No sounds found in this pack.</p>
        </div>
      ) : (
        <SoundGrid sounds={sounds} />
      )}
    </div>
  );
};
