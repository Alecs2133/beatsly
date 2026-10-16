import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-shell';
import { ChevronLeft, Crown, ExternalLink, KeyRound, Loader2, Pencil, RotateCw, ShieldAlert, UserRound } from 'lucide-react';
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
// Întoarcerea cardului: prima jumătate accelerează spre muchie, a doua
// intră cu un mic arc. Web Animations, nu tranziții CSS — se pot înlănțui
// exact, fără cadrul „sărit” dintre ele.
const FLIP_OUT: KeyframeAnimationOptions = { duration: 260, easing: 'cubic-bezier(0.45, 0, 0.85, 0.35)', fill: 'forwards' };
const FLIP_IN: KeyframeAnimationOptions = { duration: 560, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1.1)' };
const VU_SEGMENTS = 14;

type Side = 'public' | 'account';

/** Nivelul unui contor pe VU-metru: scară logaritmică, 1000+ umple tot. */
const vuLevel = (n: number) => Math.min(VU_SEGMENTS, Math.round(Math.log10(n + 1) * (VU_SEGMENTS / 3)));

function VuMeter({ label, value, index }: { label: string; value: number; index: number }) {
  const lit = vuLevel(value);
  return (
    <div className="vu" style={{ '--i': index } as React.CSSProperties}>
      <span className="vu-value num">{value}</span>
      <span className="vu-bar" aria-hidden>
        {Array.from({ length: VU_SEGMENTS }, (_, i) => (
          <i key={i} className={i < lit ? 'on' : ''} style={{ '--k': i } as React.CSSProperties} />
        ))}
      </span>
      <span className="vu-label">{label}</span>
    </div>
  );
}

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

  const [side, setSide] = useState<Side>('public');
  const faceRef = useRef<HTMLDivElement>(null);
  const turning = useRef(false);
  const enterNext = useRef(false);

  // După ce React a pus conținutul nou, aceeași față intră din partea cealaltă.
  useLayoutEffect(() => {
    const el = faceRef.current;
    if (!enterNext.current || !el) return;
    enterNext.current = false;
    document.querySelector('.main-content')?.scrollTo({ top: 0 });
    el.getAnimations().forEach(a => a.cancel());
    el.animate(
      [
        { transform: 'rotateY(-90deg) scale(0.97)', opacity: 0.4 },
        { transform: 'rotateY(0deg) scale(1)', opacity: 1 },
      ],
      FLIP_IN
    ).finished.finally(() => { turning.current = false; });
  }, [side]);

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

  // Cardul se întoarce: rotim fața curentă până la 90°, schimbăm conținutul
  // (spatele e mai înalt), apoi noua față intră din cealaltă parte.
  const flip = () => {
    if (turning.current) return;
    const next: Side = side === 'public' ? 'account' : 'public';
    const el = faceRef.current;
    if (!el || typeof el.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSide(next);
      document.querySelector('.main-content')?.scrollTo({ top: 0 });
      return;
    }
    turning.current = true;
    el.animate(
      [
        { transform: 'rotateY(0deg) scale(1)', opacity: 1 },
        { transform: 'rotateY(90deg) scale(0.97)', opacity: 0.4 },
      ],
      FLIP_OUT
    ).finished.then(
      () => {
        enterNext.current = true;
        setSide(next);
      },
      () => { turning.current = false; }
    );
  };

  const openWebsite = async () => {
    try {
      await open(WEBSITE_PROFILE_URL);
    } catch (err) {
      console.error('Failed to open website:', err);
    }
  };

  const front = (
    <>
      <header className="idcard-hero">
        <button className="profile-hero-avatar" onClick={() => setEditing(true)} title={t('profile_edit')}>
          <Avatar path={profile.avatar_path} name={name} size={148} />
          <span className="profile-photo-overlay">
            <Pencil size={24} />
            <span>{t('profile_edit')}</span>
          </span>
        </button>

        <div className="idcard-info">
          <span className="idcard-label">{t('profile_label')}</span>
          <h1 className="idcard-name" title={name}>{name}</h1>
          <div className="idcard-chips">
            {profile.username && <span>@{profile.username}</span>}
            <span><Crown size={13} /> {t(TIER_LABEL[profile.tier] ?? 'free')}</span>
            <span>{unlimited ? t('unlimited') : <><b className="num">{profile.credits}</b> {t('topbar_credits')}</>}</span>
          </div>
        </div>
      </header>

      <div className="idcard-vu">
        <VuMeter index={0} label={t('vu_sounds')} value={stats?.sound_count ?? 0} />
        <VuMeter index={1} label={t('vu_followers')} value={stats?.follower_count ?? 0} />
        <VuMeter index={2} label={t('vu_following')} value={stats?.following_count ?? 0} />
      </div>

      <section className="idcard-about">
        <p className={profile.bio ? 'profile-bio' : 'profile-bio muted'}>{profile.bio || t('profile_no_bio')}</p>
        <SocialLinkList links={links} />
      </section>

      <div className="idcard-actions">
        <button className="btn-primary-pill" onClick={() => setEditing(true)}>
          <Pencil size={16} /> {t('profile_edit')}
        </button>
        <button className="btn-ghost-pill" onClick={() => navigate(`/producer/${user.id}`)}>
          <UserRound size={16} /> {t('profile_view_public')}
        </button>
        <button className="btn-ghost-pill idcard-flip" onClick={flip}>
          <RotateCw size={16} /> {t('profile_account_side')}
        </button>
      </div>
    </>
  );

  const back = (
    <>
      <div className="idcard-back-head">
        <button type="button" className="back-link" onClick={flip}>
          <ChevronLeft size={16} /> {t('profile_public_side')}
        </button>
        <h1>{t('profile_account_side')}</h1>
      </div>

      <div className="account-grid">
        {/* Abonament */}
        <section className="account-card">
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
                {unlimited ? t('unlimited') : <span className="num">{profile.credits}</span>}
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
        <form className="account-card" onSubmit={savePassword}>
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
      <form className="account-card" onSubmit={saveDetails}>
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
      <section className="account-card danger">
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
    </>
  );

  return (
    <div className="account-page">
      <div className="flip-stage">
        <div ref={faceRef} className={`flip-face ${side}`}>
          {side === 'public' ? front : back}
        </div>
      </div>

      {editing && <EditProfileModal onClose={() => setEditing(false)} />}
    </div>
  );
};
