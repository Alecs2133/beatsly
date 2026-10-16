import React, { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { errorMessage } from '../lib/errors';
import { RoleBadge, hasRoleBadge } from './RoleBadge';
import type { TranslationKeys } from '../i18n/en';

/** Rolurile pe care le poate acorda un admin (aceeași listă ca `approve_role_request`). */
const REQUESTABLE: { value: string; label: TranslationKeys }[] = [
  { value: 'PRODUCER', label: 'role_producer' },
  { value: 'ARTIST', label: 'role_artist' },
  { value: 'VIDEO MAKER', label: 'role_video_maker' },
  { value: 'EDITOR', label: 'role_editor' },
  { value: 'SOUND ENGINEER', label: 'role_sound_engineer' },
];

/**
 * Cererea de badge din „Editează profilul”: alegi rolul, lași un link care
 * dovedește că ești tu, iar un admin o aprobă din panoul de administrare.
 * Nu e un <form> — stă în interiorul formularului de profil.
 */
export const BadgeRequest: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const showToast = useAppStore(s => s.showToast);

  const [role, setRole] = useState(REQUESTABLE[0].value);
  const [link, setLink] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // O cerere deja trimisă și neprocesată — nu lăsăm să se trimită încă una.
  useEffect(() => {
    if (!user) return;
    supabase
      .from('role_requests')
      .select('requested_role')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPending(data?.requested_role ?? null));
  }, [user]);

  if (!user || !profile) return null;
  // Adminii și OWNER-ul nu cer badge-uri.
  if (profile.role === 'OWNER' || profile.role === 'PRODUCER ADMIN') return null;

  const send = async () => {
    const trimmed = link.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(trimmed)) {
      showToast(t('badge_link_invalid'), 'error');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase
        .from('role_requests')
        .insert({ user_id: user.id, social_links: trimmed, status: 'pending', requested_role: role });
      if (error) throw error;
      setPending(role);
      setLink('');
      showToast(t('application_sent'), 'success');
    } catch (err) {
      showToast(`${t('application_failed')}: ${errorMessage(err)}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const roleLabel = (value: string) => {
    const found = REQUESTABLE.find(r => r.value === value);
    return found ? t(found.label) : value;
  };

  return (
    <div className="form-group badge-request">
      <span className="form-label">{t('badge_title')}</span>

      {hasRoleBadge(profile.role) && (
        <p className="badge-current">
          <RoleBadge role={profile.role} size={18} /> {t('badge_current', { role: roleLabel(profile.role) })}
        </p>
      )}

      {pending ? (
        <p className="form-hint">{t('badge_pending', { role: roleLabel(pending) })}</p>
      ) : (
        <>
          <span className="form-hint">{t('badge_hint')}</span>
          <div className="badge-request-row">
            <select className="form-input" value={role} onChange={e => setRole(e.target.value)} aria-label={t('badge_title')}>
              {REQUESTABLE.map(r => (
                <option key={r.value} value={r.value}>{t(r.label)}</option>
              ))}
            </select>
            <input
              className="form-input"
              value={link}
              placeholder="https://instagram.com/…"
              onChange={e => setLink(e.target.value)}
              inputMode="url"
              spellCheck={false}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            />
            <button type="button" className="btn-ghost-pill" onClick={send} disabled={sending || !link.trim()}>
              {sending ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
              {t('badge_send')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
