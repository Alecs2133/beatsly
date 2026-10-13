import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { removeAvatar, updatePublicProfile, uploadAvatar } from '../lib/profile';
import { cleanSocialLinks, readSocialLinks, SOCIAL_KEYS, type SocialKey } from '../lib/socialLinks';
import { errorMessage } from '../lib/errors';
import type { TranslationKeys } from '../i18n/en';

const LINK_LABELS: Record<SocialKey, TranslationKeys> = {
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

const DISPLAY_NAME_MAX = 50;
const BIO_MAX = 500;

interface EditProfileModalProps {
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const showToast = useAppStore(s => s.showToast);
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const setProfile = useAuthStore(s => s.setProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [links, setLinks] = useState<Record<SocialKey, string>>(() => {
    const current = readSocialLinks(profile?.social_links);
    return Object.fromEntries(SOCIAL_KEYS.map(k => [k, current[k] ?? ''])) as Record<SocialKey, string>;
  });
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  if (!user || !profile) return null;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      const path = await uploadAvatar(user.id, file, profile.avatar_path);
      setProfile({ ...profile, avatar_path: path });
      showToast(t('profile_photo_updated'), 'success');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      showToast(t('profile_photo_failed'), 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile.avatar_path) return;
    setPhotoBusy(true);
    try {
      await removeAvatar(user.id, profile.avatar_path);
      setProfile({ ...profile, avatar_path: null });
      showToast(t('profile_photo_removed'), 'info');
    } catch (err) {
      showToast(`${t('profile_save_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { links: cleanLinks, invalid } = cleanSocialLinks(links);
    if (invalid.length > 0) {
      showToast(t('profile_invalid_links', { fields: invalid.map(k => t(LINK_LABELS[k])).join(', ') }), 'error');
      return;
    }

    const fields = {
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      social_links: cleanLinks,
    };

    setSaving(true);
    try {
      await updatePublicProfile(user.id, fields);
      setProfile({ ...profile, ...fields });
      showToast(t('profile_saved'), 'success');
      onClose();
    } catch (err) {
      showToast(`${t('profile_save_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-modal-overlay" onMouseDown={e => e.target === e.currentTarget && !saving && onClose()}>
      <form className="profile-modal glass" onSubmit={handleSave} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <div className="profile-modal-header">
          <h2 id="edit-profile-title">{t('profile_edit')}</h2>
          <button type="button" className="profile-icon-btn" onClick={onClose} disabled={saving} aria-label={t('btn_cancel')}>
            <X size={18} />
          </button>
        </div>

        <div className="profile-modal-body">
          <div className="profile-modal-photo">
            <button
              type="button"
              className="profile-photo-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoBusy}
              title={t('profile_change_photo')}
            >
              <Avatar path={profile.avatar_path} name={displayName || profile.username} size={132} />
              <span className="profile-photo-overlay">
                {photoBusy ? <Loader2 size={26} className="spin" /> : <Camera size={26} />}
                <span>{t('profile_change_photo')}</span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={handlePhoto}
            />
            {profile.avatar_path && (
              <button type="button" className="profile-text-btn" onClick={handleRemovePhoto} disabled={photoBusy}>
                <Trash2 size={14} /> {t('profile_remove_photo')}
              </button>
            )}
          </div>

          <div className="profile-modal-fields">
            <label className="form-group">
              <span className="form-label">{t('profile_display_name')}</span>
              <input
                className="form-input"
                value={displayName}
                maxLength={DISPLAY_NAME_MAX}
                placeholder={profile.username ?? ''}
                onChange={e => setDisplayName(e.target.value)}
              />
              <span className="form-hint">{t('profile_display_name_hint')}</span>
            </label>

            <label className="form-group">
              <span className="form-label">{t('profile_bio')}</span>
              <textarea
                className="form-input"
                rows={4}
                value={bio}
                maxLength={BIO_MAX}
                placeholder={t('profile_bio_placeholder')}
                onChange={e => setBio(e.target.value)}
              />
              <span className="form-hint form-counter">{bio.length}/{BIO_MAX}</span>
            </label>

            <div className="form-group">
              <span className="form-label">{t('profile_links')}</span>
              <div className="profile-links-grid">
                {SOCIAL_KEYS.map(key => (
                  <label key={key} className="profile-link-field">
                    <span>{t(LINK_LABELS[key])}</span>
                    <input
                      className="form-input"
                      value={links[key]}
                      placeholder={LINK_PLACEHOLDERS[key]}
                      onChange={e => setLinks(prev => ({ ...prev, [key]: e.target.value }))}
                      inputMode="url"
                      spellCheck={false}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-modal-footer">
          <span className="form-hint">{t('profile_public_hint')}</span>
          <button type="submit" className="btn-primary-pill" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : null}
            {saving ? t('saving') : t('save_changes')}
          </button>
        </div>
      </form>
    </div>
  );
};
