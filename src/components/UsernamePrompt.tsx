import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { errorMessage } from '../lib/errors';
import './UsernamePrompt.css';

// Aceeași regulă ca în baza de date (public.is_valid_username) și pe site.
const USERNAME_RE = /^[A-Za-z0-9._]{3,24}$/;

/**
 * Username-ul e obligatoriu. Conturile create înainte să-l salvăm corect îl
 * aleg aici, o singură dată, înainte să folosească aplicația.
 */
export const UsernamePrompt: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const setProfile = useAuthStore(s => s.setProfile);
  const signOut = useAuthStore(s => s.signOut);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user || !profile) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = value.trim();
    if (!USERNAME_RE.test(username)) {
      setError(t('auth_username_invalid'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error: updateError } = await supabase.from('profiles').update({ username }).eq('id', user.id);
      if (updateError) {
        // Indexul unic pe username: altcineva îl are deja.
        if (updateError.code === '23505') {
          setError(t('auth_username_taken'));
          return;
        }
        throw updateError;
      }
      setProfile({ ...profile, username });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="un-overlay">
      <form className="un-panel" onSubmit={save} aria-labelledby="un-title">
        <h2 id="un-title">{t('username_prompt_title')}</h2>
        <p>{t('username_prompt_text')}</p>
        <div className="un-field">
          <span>@</span>
          <input
            value={value}
            onChange={e => setValue(e.target.value.replace(/\s/g, ''))}
            maxLength={24}
            autoFocus
            spellCheck={false}
            placeholder={t('username')}
            aria-label={t('username')}
          />
        </div>
        <small>{error || t('auth_username_hint')}</small>
        <div className="un-actions">
          <button type="button" className="link-btn" onClick={() => signOut()}>{t('topbar_logout')}</button>
          <button type="submit" className="btn-primary-pill" disabled={saving || value.trim().length < 3}>
            {saving && <Loader2 size={15} className="spin" />}
            {t('username_prompt_save')}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};
