import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle, Camera, CheckCircle2, Coins, Crown, ExternalLink, KeyRound, Loader2, Lock, ShieldAlert, Trash2, UserRound,
} from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useLayoutContext } from '../lib/layoutContext';
import { supabase } from '../lib/supabase';
import { readFunctionError } from '../lib/functionError';
import {
  avatarUrl, deleteAccount, fetchMyProfile, removeAvatar, updatePublicProfile, uploadAvatar, type MyProfile,
} from '../lib/profile';
import { cleanSocialLinks, readSocialLinks, SOCIAL_KEYS, type SocialKey } from '../lib/socialLinks';
import { useT } from '../i18n/context';
import type { TranslationKey } from '../i18n/en';
import './Profile.css';

const LINK_LABELS: Record<SocialKey, TranslationKey> = {
  website: 'profile_link_website',
  instagram: 'profile_link_instagram',
  youtube: 'profile_link_youtube',
  soundcloud: 'profile_link_soundcloud',
  spotify: 'profile_link_spotify',
};

const LINK_PLACEHOLDERS: Record<SocialKey, string> = {
  website: 'yoursite.com',
  instagram: 'instagram.com/…',
  youtube: 'youtube.com/@…',
  soundcloud: 'soundcloud.com/…',
  spotify: 'open.spotify.com/artist/…',
};

const TIER_LABEL: Record<MyProfile['tier'], TranslationKey> = {
  free: 'tier_free',
  producer: 'tier_producer',
  ultimate: 'tier_ultimate',
};

const PASSWORD_MIN = 8;

type Notice = { kind: 'ok' | 'error'; text: string } | null;

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div className={notice.kind === 'ok' ? 'account-success' : 'account-error'}>
      {notice.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{notice.text}</span>
    </div>
  );
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') return err.message;
  return String(err);
}

/** Nuanță stabilă din nume, aceeași regulă ca avatarul din aplicație. */
function nameHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function Profile() {
  const { t } = useT();
  const navigate = useNavigate();
  const { user, authReady, requestAuth } = useLayoutContext();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section');
  const checkoutSuccess = searchParams.get('checkout') === 'success';

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profil public
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<Record<SocialKey, string>>(
    () => Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ''])) as Record<SocialKey, string>
  );
  const [savingPublic, setSavingPublic] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [publicNotice, setPublicNotice] = useState<Notice>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cont
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [accountNotice, setAccountNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);

  // Abonament
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Ștergere
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMyProfile(user.id)
      .then((p) => {
        if (cancelled || !p) return;
        setProfile(p);
        setDisplayName(p.display_name ?? '');
        setBio(p.bio ?? '');
        setUsername(p.username ?? '');
        const current = readSocialLinks(p.social_links);
        setLinks(Object.fromEntries(SOCIAL_KEYS.map((k) => [k, current[k] ?? ''])) as Record<SocialKey, string>);
      })
      .catch((err) => console.error('Failed to load profile:', err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user, authReady]);

  // Din aplicație sau din emailul de resetare se ajunge direct la o secțiune.
  useEffect(() => {
    if (loading || !section) return;
    document.getElementById(`profile-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading, section]);

  if (!authReady || (user && loading)) {
    return (
      <header className="page-intro">
        <Loader2 size={28} className="spin" />
      </header>
    );
  }

  if (!user) {
    return (
      <header className="page-intro">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.div variants={fadeInUp} className="account-lock-icon">
            <Lock size={28} />
          </motion.div>
          <motion.h1 className="page-title" variants={fadeInUp}>
            {t('profile_signin_title_1')} <span className="glow-text">{t('profile_signin_title_2')}</span>
          </motion.h1>
          <motion.p className="page-subtitle" variants={fadeInUp}>{t('profile_signin_text')}</motion.p>
          <motion.div variants={fadeInUp} style={{ marginTop: 28 }}>
            <button onClick={requestAuth} className="btn btn-primary">{t('common_sign_in')}</button>
          </motion.div>
        </motion.div>
      </header>
    );
  }

  const name = displayName.trim() || profile?.display_name || profile?.username || user.email?.split('@')[0] || '';
  const photo = avatarUrl(profile?.avatar_path);
  const isPaid = profile?.tier === 'producer' || profile?.tier === 'ultimate';

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile) return;
    setPhotoBusy(true);
    setPublicNotice(null);
    try {
      const path = await uploadAvatar(user.id, file, profile.avatar_path);
      setProfile({ ...profile, avatar_path: path });
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setPublicNotice({ kind: 'error', text: t('profile_photo_failed') });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile?.avatar_path) return;
    setPhotoBusy(true);
    try {
      await removeAvatar(user.id, profile.avatar_path);
      setProfile({ ...profile, avatar_path: null });
    } catch (err) {
      setPublicNotice({ kind: 'error', text: `${t('profile_save_failed')} ${errorText(err)}` });
    } finally {
      setPhotoBusy(false);
    }
  };

  const savePublic = async (e: React.FormEvent) => {
    e.preventDefault();
    const { links: clean, invalid } = cleanSocialLinks(links);
    if (invalid.length > 0) {
      setPublicNotice({ kind: 'error', text: t('profile_invalid_links', { fields: invalid.map((k) => t(LINK_LABELS[k])).join(', ') }) });
      return;
    }
    setSavingPublic(true);
    setPublicNotice(null);
    try {
      const fields = { display_name: displayName.trim() || null, bio: bio.trim() || null, social_links: clean };
      await updatePublicProfile(user.id, fields);
      if (profile) setProfile({ ...profile, ...fields });
      setPublicNotice({ kind: 'ok', text: t('profile_saved') });
    } catch (err) {
      setPublicNotice({ kind: 'error', text: `${t('profile_save_failed')} ${errorText(err)}` });
    } finally {
      setSavingPublic(false);
    }
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setAccountNotice(null);
    try {
      const { error } = await supabase.from('profiles').update({ username: username.trim() || null }).eq('id', user.id);
      if (error) throw error;
      setAccountNotice({ kind: 'ok', text: t('profile_saved') });
    } catch (err) {
      setAccountNotice({ kind: 'error', text: `${t('profile_save_failed')} ${errorText(err)}` });
    } finally {
      setSavingAccount(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    if (!newPassword || !confirmPassword) return setPasswordNotice({ kind: 'error', text: t('password_fill_both') });
    if (newPassword !== confirmPassword) return setPasswordNotice({ kind: 'error', text: t('password_mismatch') });
    if (newPassword.length < PASSWORD_MIN) return setPasswordNotice({ kind: 'error', text: t('password_too_short') });
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice({ kind: 'ok', text: t('password_updated') });
    } catch (err) {
      setPasswordNotice({ kind: 'error', text: `${t('profile_save_failed')} ${errorText(err)}` });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalError(null);
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {});
      if (error) {
        const { status, detail } = await readFunctionError(error);
        if (status === 503 || detail.error === 'portal_not_configured') setPortalError(t('account_portal_not_configured'));
        else if (status === 404 || detail.error === 'no_subscription') setPortalError(t('account_no_subscription'));
        else setPortalError(t('account_portal_failed'));
        return;
      }
      if (data?.url) window.location.href = data.url;
      else setPortalError(t('account_portal_failed'));
    } catch (err) {
      console.error('create-portal-session failed:', err);
      setPortalError(t('account_portal_failed'));
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== 'DELETE') return;
    setDeleting(true);
    setDeleteNotice(null);
    try {
      const result = await deleteAccount();
      if (result === 'active_subscription') {
        setDeleteNotice({ kind: 'error', text: t('profile_delete_active_sub') });
        return;
      }
      await supabase.auth.signOut({ scope: 'local' });
      navigate('/');
    } catch (err) {
      setDeleteNotice({ kind: 'error', text: `${t('profile_delete_failed')} ${errorText(err)}` });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <header className="profile-page-hero">
        <div className="profile-page-hero-inner">
          <button
            type="button"
            className="profile-page-avatar"
            style={{ '--ah': nameHue(name) } as React.CSSProperties}
            onClick={() => fileInputRef.current?.click()}
            disabled={photoBusy}
            title={t('profile_change_photo')}
          >
            {photo ? <img src={photo} alt="" /> : <span>{(name[0] ?? '?').toUpperCase()}</span>}
            <span className="profile-page-avatar-overlay">
              {photoBusy ? <Loader2 size={24} className="spin" /> : <Camera size={24} />}
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handlePhoto} />
          <div className="profile-page-hero-text">
            <span className="profile-page-label">{t('profile_label')}</span>
            <h1>{name}</h1>
            <p>{profile?.username ? `@${profile.username} · ` : ''}{user.email}</p>
          </div>
        </div>
      </header>

      <section className="profile-page-body">
        {/* Profil public */}
        <form id="profile-public" className="account-card glass" onSubmit={savePublic}>
          <div className="account-card-header">
            <div className="account-card-icon profile-icon-purple"><UserRound size={22} /></div>
            <div>
              <h2>{t('profile_tab_public')}</h2>
              <p>{t('profile_public_desc')}</p>
            </div>
          </div>

          {profile?.avatar_path && (
            <button type="button" className="profile-text-btn" onClick={handleRemovePhoto} disabled={photoBusy}>
              <Trash2 size={14} /> {t('profile_remove_photo')}
            </button>
          )}

          <label className="profile-field">
            <span>{t('profile_display_name')}</span>
            <input value={displayName} maxLength={50} placeholder={profile?.username ?? ''} onChange={(e) => setDisplayName(e.target.value)} />
            <small>{t('profile_display_name_hint')}</small>
          </label>

          <label className="profile-field">
            <span>{t('profile_bio')}</span>
            <textarea rows={4} value={bio} maxLength={500} placeholder={t('profile_bio_placeholder')} onChange={(e) => setBio(e.target.value)} />
            <small className="profile-counter">{bio.length}/500</small>
          </label>

          <div className="profile-field">
            <span>{t('profile_links')}</span>
            <div className="profile-links">
              {SOCIAL_KEYS.map((key) => (
                <label key={key}>
                  <small>{t(LINK_LABELS[key])}</small>
                  <input
                    value={links[key]}
                    placeholder={LINK_PLACEHOLDERS[key]}
                    inputMode="url"
                    spellCheck={false}
                    onChange={(e) => setLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </div>

          <NoticeLine notice={publicNotice} />
          <button type="submit" className="btn btn-primary" disabled={savingPublic}>
            {savingPublic && <Loader2 size={16} className="spin" />}
            {savingPublic ? t('common_saving') : t('common_save')}
          </button>
        </form>

        {/* Abonament */}
        <div id="profile-subscription" className="account-card glass">
          {checkoutSuccess && (
            <div className="account-success">
              <CheckCircle2 size={16} />
              <span>{t('account_checkout_success')}</span>
            </div>
          )}
          <div className="account-card-header">
            <div className="account-card-icon"><Crown size={22} /></div>
            <div>
              <h2>{t('profile_tab_subscription')}</h2>
            </div>
          </div>
          <div className="account-stats">
            <div className="account-stat">
              <span className="account-stat-label">{t('account_plan')}</span>
              <span className="account-stat-value">{profile ? t(TIER_LABEL[profile.tier] ?? 'tier_free') : '—'}</span>
            </div>
            <div className="account-stat">
              <span className="account-stat-label">{t('account_credits')}</span>
              <span className="account-stat-value account-stat-credits">
                {profile?.tier === 'ultimate' ? t('account_unlimited') : <><Coins size={16} /> {profile?.credits ?? 0}</>}
              </span>
            </div>
          </div>
          {portalError && (
            <div className="account-error">
              <AlertCircle size={16} />
              <span>{portalError}</span>
            </div>
          )}
          <div className="account-actions">
            {isPaid && profile?.stripe_customer_id ? (
              <button onClick={handleManageSubscription} disabled={openingPortal} className="btn btn-primary">
                {openingPortal ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />}
                {t('account_manage')}
              </button>
            ) : (
              <>
                <p className="account-upgrade-hint">{t('account_free_hint')}</p>
                <Link to="/pricing" className="btn btn-secondary glass-btn">{t('account_upgrade')}</Link>
              </>
            )}
          </div>
        </div>

        {/* Cont + parolă */}
        <div id="profile-security" className="account-card glass">
          <div className="account-card-header">
            <div className="account-card-icon profile-icon-cyan"><KeyRound size={22} /></div>
            <div>
              <h2>{t('profile_tab_account')}</h2>
              <p>{t('profile_password_desc')}</p>
            </div>
          </div>

          <form onSubmit={saveAccount} className="profile-subform">
            <label className="profile-field">
              <span>{t('profile_email')}</span>
              <input value={user.email ?? ''} disabled />
            </label>
            <label className="profile-field">
              <span>{t('profile_username')}</span>
              <input value={username} autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
            </label>
            <NoticeLine notice={accountNotice} />
            <button type="submit" className="btn btn-secondary glass-btn" disabled={savingAccount}>
              {savingAccount && <Loader2 size={16} className="spin" />}
              {t('common_save')}
            </button>
          </form>

          <form onSubmit={savePassword} className="profile-subform">
            <h3>{t('profile_password_title')}</h3>
            {section === 'security' && <p className="profile-recovery">{t('profile_recovery_notice')}</p>}
            <label className="profile-field">
              <span>{t('profile_new_password')}</span>
              <input type="password" autoComplete="new-password" minLength={PASSWORD_MIN} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            <label className="profile-field">
              <span>{t('profile_confirm_password')}</span>
              <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </label>
            <NoticeLine notice={passwordNotice} />
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword && <Loader2 size={16} className="spin" />}
              {t('profile_password_update')}
            </button>
          </form>
        </div>

        {/* Ștergerea contului */}
        <div id="profile-delete" className="account-card glass profile-danger">
          <div className="account-card-header">
            <div className="account-card-icon profile-icon-red"><ShieldAlert size={22} /></div>
            <div>
              <h2>{t('profile_danger')}</h2>
              <p>{t('profile_delete_desc')}</p>
            </div>
          </div>
          <div className="profile-danger-row">
            <input value={deleteText} placeholder={t('profile_delete_type')} spellCheck={false} onChange={(e) => setDeleteText(e.target.value)} />
            <button className="btn profile-btn-danger" onClick={handleDelete} disabled={deleteText !== 'DELETE' || deleting}>
              {deleting && <Loader2 size={16} className="spin" />}
              {t('profile_delete_confirm')}
            </button>
          </div>
          <NoticeLine notice={deleteNotice} />
        </div>
      </section>
    </>
  );
}
