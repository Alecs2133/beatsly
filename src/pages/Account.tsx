import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-shell';
import { Coins, Crown, ExternalLink, KeyRound, Loader2, Pencil, ShieldAlert, UserRound } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import { errorMessage } from '../lib/errors';
import { hasUnlimitedCredits } from '../lib/roles';
import { getPublicProfile, profileName, type PublicProfile } from '../lib/social';
import { deleteAccount } from '../lib/profile';
import { readSocialLinks } from '../lib/socialLinks';
import { Avatar } from '../components/Avatar';
import { EditProfileModal } from '../components/EditProfileModal';
import { SocialLinkList } from '../components/SocialLinkList';
import type { TranslationKeys } from '../i18n/en';
import './Account.css';

const WEBSITE_PROFILE_URL = 'https://beatsly.vercel.app/profile?section=subscription';
const PASSWORD_MIN = 8;

const TIER_LABEL: Record<string, TranslationKeys> = {
  free: 'free',
  producer: 'producer_pack',
  ultimate: 'ultimate_pack',
};

export const Account: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, setProfile, signOut } = useAuthStore();
  const { showToast } = useAppStore();
  const { t } = useTranslation();

  const [stats, setStats] = useState<PublicProfile | null>(null);
  const [editing, setEditing] = useState(false);

  const [details, setDetails] = useState({ username: '', first_name: '', last_name: '', phone_number: '' });
  const [savingDetails, setSavingDetails] = useState(false);

  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDetails({
      username: profile.username || '',
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone_number: profile.phone_number || '',
    });
  }, [profile]);

  // Contoarele (sunete, urmăritori) vin din același RPC ca profilul public.
  useEffect(() => {
    if (!user) return;
    getPublicProfile(user.id)
      .then(setStats)
      .catch(err => console.error('Failed to load profile stats:', err));
  }, [user]);

  if (!user || !profile) return null;

  const name = profileName(profile) || user.email || '';
  const links = readSocialLinks(profile.social_links);
  const unlimited = hasUnlimitedCredits(profile.role, profile.tier);

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      const { error } = await supabase.from('profiles').update(details).eq('id', user.id);
      if (error) throw error;
      setProfile({ ...profile, ...details });
      showToast(t('profile_updated'), 'success');
    } catch (err) {
      showToast(`${t('profile_save_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setSavingDetails(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.newPassword || !passwords.confirmPassword) {
      showToast(t('password_fill_both'), 'error');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast(t('password_mismatch'), 'error');
      return;
    }
    if (passwords.newPassword.length < PASSWORD_MIN) {
      showToast(t('password_too_short'), 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      showToast(t('password_updated'), 'success');
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(`${t('profile_save_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== 'DELETE') return;
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (result === 'active_subscription') {
        showToast(t('delete_account_active_sub'), 'error');
        return;
      }
      showToast(t('account_deleted'), 'info');
      await signOut();
      navigate('/');
    } catch (err) {
      showToast(`${t('delete_account_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openWebsite = async () => {
    try {
      await open(WEBSITE_PROFILE_URL);
    } catch (err) {
      console.error('Failed to open website:', err);
    }
  };

  return (
    <div className="account-page">
      {/* Antet ca pe Spotify: poză mare, nume uriaș, statistici dedesubt */}
      <header className="profile-hero">
        <button className="profile-hero-avatar" onClick={() => setEditing(true)} title={t('profile_edit')}>
          <Avatar path={profile.avatar_path} name={name} size={176} />
          <span className="profile-photo-overlay">
            <Pencil size={26} />
            <span>{t('profile_edit')}</span>
          </span>
        </button>

        <div className="profile-hero-info">
          <span className="profile-hero-label">{t('profile_label')}</span>
          <h1 className="profile-hero-name" title={name}>{name}</h1>
          <div className="profile-hero-meta">
            {profile.username && <span>@{profile.username}</span>}
            {stats && (
              <>
                <span>{t('profile_sounds', { count: stats.sound_count })}</span>
                <span>{t('profile_followers', { count: stats.follower_count })}</span>
                <span>{t('profile_following', { count: stats.following_count })}</span>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="profile-actions">
        <button className="btn-primary-pill" onClick={() => setEditing(true)}>
          <Pencil size={16} /> {t('profile_edit')}
        </button>
        <button className="btn-ghost-pill" onClick={() => navigate(`/producer/${user.id}`)}>
          <UserRound size={16} /> {t('profile_view_public')}
        </button>
      </div>

      <section className="profile-about">
        <p className={profile.bio ? 'profile-bio' : 'profile-bio muted'}>{profile.bio || t('profile_no_bio')}</p>
        <SocialLinkList links={links} />
      </section>

      <div className="account-grid">
        {/* Abonament */}
        <section className="account-card glass">
          <div className="account-card-head">
            <Crown size={20} />
            <div>
              <h2>{t('subscription_title')}</h2>
              <p>{t('subscription_desc')}</p>
            </div>
          </div>
          <div className="account-stats">
            <div>
              <span className="account-stat-label">{t('current_plan')}</span>
              <span className="account-stat-value">{t(TIER_LABEL[profile.tier] ?? 'free')}</span>
            </div>
            <div>
              <span className="account-stat-label">{t('credits_label')}</span>
              <span className="account-stat-value">
                {unlimited ? t('unlimited') : <><Coins size={16} /> {profile.credits}</>}
              </span>
            </div>
          </div>
          <div className="account-card-actions">
            <button className="btn-ghost-pill" onClick={() => navigate('/store')}>{t('upgrade_store')}</button>
            <button className="btn-ghost-pill" onClick={openWebsite}>
              <ExternalLink size={14} /> {t('subscription_manage_web')}
            </button>
          </div>
        </section>

        {/* Parola */}
        <form className="account-card glass" onSubmit={savePassword}>
          <div className="account-card-head">
            <KeyRound size={20} />
            <div>
              <h2>{t('security')}</h2>
              <p>{t('security_desc')}</p>
            </div>
          </div>
          <label className="form-group">
            <span className="form-label">{t('new_password')}</span>
            <input
              className="form-input"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              value={passwords.newPassword}
              onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
            />
          </label>
          <label className="form-group">
            <span className="form-label">{t('confirm_password')}</span>
            <input
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
            />
          </label>
          <div className="account-card-actions">
            <button type="submit" className="btn-primary-pill" disabled={savingPassword}>
              {savingPassword && <Loader2 size={16} className="spin" />}
              {savingPassword ? t('updating') : t('update_password')}
            </button>
          </div>
        </form>
      </div>

      {/* Date private */}
      <form className="account-card glass" onSubmit={saveDetails}>
        <div className="account-card-head">
          <UserRound size={20} />
          <div>
            <h2>{t('account_section_title')}</h2>
            <p>{t('account_section_desc')}</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="form-group">
            <span className="form-label">{t('email_address')}</span>
            <input className="form-input" value={user.email ?? ''} disabled />
          </label>
          <label className="form-group">
            <span className="form-label">{t('username')}</span>
            <input
              className="form-input"
              value={details.username}
              autoComplete="username"
              onChange={e => setDetails(d => ({ ...d, username: e.target.value }))}
            />
          </label>
          <label className="form-group">
            <span className="form-label">{t('first_name')}</span>
            <input
              className="form-input"
              value={details.first_name}
              autoComplete="given-name"
              onChange={e => setDetails(d => ({ ...d, first_name: e.target.value }))}
            />
          </label>
          <label className="form-group">
            <span className="form-label">{t('last_name')}</span>
            <input
              className="form-input"
              value={details.last_name}
              autoComplete="family-name"
              onChange={e => setDetails(d => ({ ...d, last_name: e.target.value }))}
            />
          </label>
          <label className="form-group">
            <span className="form-label">{t('phone_number')}</span>
            <input
              className="form-input"
              type="tel"
              value={details.phone_number}
              autoComplete="tel"
              onChange={e => setDetails(d => ({ ...d, phone_number: e.target.value }))}
            />
          </label>
        </div>
        <div className="account-card-actions">
          <button type="submit" className="btn-primary-pill" disabled={savingDetails}>
            {savingDetails && <Loader2 size={16} className="spin" />}
            {savingDetails ? t('saving') : t('save_changes')}
          </button>
        </div>
      </form>

      {/* Ștergerea contului */}
      <section className="account-card glass danger">
        <div className="account-card-head">
          <ShieldAlert size={20} />
          <div>
            <h2>{t('danger_zone')}</h2>
            <p>{t('delete_account_desc')}</p>
          </div>
        </div>
        <div className="danger-row">
          <input
            className="form-input"
            value={deleteText}
            placeholder={t('delete_account_type')}
            onChange={e => setDeleteText(e.target.value)}
            spellCheck={false}
          />
          <button className="btn-danger-pill" onClick={handleDelete} disabled={deleteText !== 'DELETE' || deleting}>
            {deleting && <Loader2 size={16} className="spin" />}
            {t('delete_account_confirm')}
          </button>
        </div>
      </section>

      {editing && <EditProfileModal onClose={() => setEditing(false)} />}
    </div>
  );
};
