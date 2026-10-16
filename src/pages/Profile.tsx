import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserPlus, UserMinus, Loader2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAllPages } from '../lib/paging';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { getPublicProfile, isFollowing, followUser, unfollowUser, profileName, PublicProfile } from '../lib/social';
import { SoundGrid } from '../components/SoundGrid';
import { Avatar } from '../components/Avatar';
import { RoleBadge } from '../components/RoleBadge';
import { SocialLinkList } from '../components/SocialLinkList';
import { SoundItem } from '../types/sound';
import { mapSoundRow } from '../lib/soundRow';
import { errorMessage } from '../lib/errors';
import { useTranslation } from '../hooks/useTranslation';
import './Account.css';

export const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useAppStore();
  const { t } = useTranslation();

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
      const [publicProfile, soundRows, followState] = await Promise.all([
        getPublicProfile(userId),
        fetchAllPages((from, to) =>
          supabase
            .from('sounds')
            .select('*')
            .eq('owner_id', userId)
            .eq('status', 'approved')
            .is('crew_id', null)
            .order('created_at', { ascending: false })
            .order('id')
            .range(from, to)
        ),
        user && user.id !== userId ? isFollowing(userId) : Promise.resolve(false),
      ]);

      setProfile(publicProfile);
      setFollowing(followState);
      setSounds(soundRows.map(mapSoundRow));
    } catch (err) {
      console.error('Failed to load profile:', err);
      showToast(`${t('profile_load_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, user, showToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleFollow = async () => {
    if (!user) {
      showToast(t('profile_follow_sign_in'), 'error');
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
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>{t('profile_not_found')}</p>
        <button className="btn-primary-pill" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
          {t('profile_back_discover')}
        </button>
      </div>
    );
  }

  const name = profileName(profile) || t('profile_unknown');

  return (
    <div className="account-page">
      <header className="profile-hero">
        <Avatar path={profile.avatar_path} name={name} size={176} className="profile-hero-static" />
        <div className="profile-hero-info">
          <span className="profile-hero-label">{t('profile_label')}</span>
          <div className="name-row">
            <h1 className="profile-hero-name" title={name}>{name}</h1>
            <RoleBadge role={profile.role} size={36} />
          </div>
          <div className="profile-hero-meta">
            {profile.username && profile.display_name && <span>@{profile.username}</span>}
            <span>{t('profile_sounds', { count: profile.sound_count })}</span>
            <span>{t('profile_followers', { count: profile.follower_count })}</span>
            <span>{t('profile_following', { count: profile.following_count })}</span>
          </div>
        </div>
      </header>

      <div className="profile-actions">
        {isOwnProfile ? (
          <button className="btn-ghost-pill" onClick={() => navigate('/account')}>
            <Pencil size={16} /> {t('profile_edit')}
          </button>
        ) : (
          <button
            className={following ? 'btn-ghost-pill' : 'btn-primary-pill'}
            onClick={handleToggleFollow}
            disabled={followBusy}
          >
            {followBusy ? <Loader2 size={16} className="spin" /> : following ? <UserMinus size={16} /> : <UserPlus size={16} />}
            {following ? t('profile_following_btn') : t('profile_follow')}
          </button>
        )}
      </div>

      {(profile.bio || Object.keys(profile.social_links).length > 0) && (
        <section className="profile-about">
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <SocialLinkList links={profile.social_links} />
        </section>
      )}

      {sounds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('profile_no_sounds')}</div>
      ) : (
        <SoundGrid sounds={sounds} />
      )}
    </div>
  );
};
