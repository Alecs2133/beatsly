import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserRound, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { getPublicProfile, isFollowing, followUser, unfollowUser, PublicProfile } from '../lib/social';
import { SoundGrid } from '../components/SoundGrid';
import { SoundItem } from '../data/mockData';

export const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useAppStore();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  const isOwnProfile = !!user && user.id === userId;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [publicProfile, soundsResult, followState] = await Promise.all([
        getPublicProfile(userId),
        supabase
          .from('sounds')
          .select('*')
          .eq('owner_id', userId)
          .eq('status', 'approved')
          .is('crew_id', null)
          .order('created_at', { ascending: false }),
        user && user.id !== userId ? isFollowing(userId) : Promise.resolve(false),
      ]);

      setProfile(publicProfile);
      setFollowing(followState);

      if (soundsResult.error) throw soundsResult.error;
      const mapped: SoundItem[] = (soundsResult.data ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        bpm: item.bpm,
        key: item.key_signature,
        tags: item.tags || [],
        duration: item.duration || '0:00',
        type: item.type,
        file_url: item.file_url,
        preview_url: item.preview_url ?? undefined,
        storage_path: item.storage_path ?? undefined,
        owner_id: item.owner_id ?? undefined,
        license: item.license,
      }));
      setSounds(mapped);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      showToast('Failed to load profile: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, user, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleFollow = async () => {
    if (!user) {
      showToast('Sign in to follow producers.', 'error');
      return;
    }
    if (!userId) return;
    setFollowBusy(true);
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
        setProfile(p => p ? { ...p, follower_count: Math.max(0, p.follower_count - 1) } : p);
      } else {
        await followUser(userId);
        setFollowing(true);
        setProfile(p => p ? { ...p, follower_count: p.follower_count + 1 } : p);
      }
    } catch (err: any) {
      showToast('Action failed: ' + err.message, 'error');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  }

  if (!profile) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>This producer doesn't exist.</p>
        <button
          onClick={() => navigate('/')}
          style={{ marginTop: 16, background: 'var(--gradient-primary)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 20, fontWeight: 'bold', cursor: 'pointer' }}
        >
          Back to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="library-page">
      <div className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserRound size={28} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{profile.username || 'Unknown producer'}</h1>
            <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              <span>{profile.sound_count} sounds</span>
              <span>{profile.follower_count} followers</span>
              <span>{profile.following_count} following</span>
            </div>
          </div>
        </div>

        {!isOwnProfile && (
          <button
            onClick={handleToggleFollow}
            disabled={followBusy}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: following ? 'rgba(255,255,255,0.08)' : 'var(--gradient-primary)',
              color: following ? 'var(--text-main)' : 'white',
              border: following ? '1px solid var(--border-strong)' : 'none',
              padding: '10px 20px', borderRadius: 20, fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            {followBusy ? <Loader2 size={16} className="spin" /> : following ? <UserMinus size={16} /> : <UserPlus size={16} />}
            {following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {sounds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No public sounds yet.</div>
      ) : (
        <SoundGrid sounds={sounds} />
      )}
    </div>
  );
};
