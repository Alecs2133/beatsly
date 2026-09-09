import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { open } from '@tauri-apps/plugin-shell';
import { Loader2, LogIn, Copy, Check } from 'lucide-react';
import './Auth.css';

const WEBSITE_URL = 'https://beatsly.vercel.app';
const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 5 * 60 * 1000; // Sincronizat cu expirarea codului pe server.

/** 256 biți — spațiul de căutare face ghicitul irelevant, indiferent de rata de cereri. */
function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

type Status = 'idle' | 'waiting' | 'success' | 'error' | 'timeout';

export const Auth: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [code, setCode] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  };

  useEffect(() => stopPolling, []);

  const pollForSession = (activeCode: string) => {
    pollRef.current = setInterval(async () => {
      let exchanged: { access_token: string; refresh_token: string } | null = null;
      try {
        const { data, error } = await supabase.functions.invoke('exchange-auth-code', {
          body: { code: activeCode },
        });
        // Codul nu e încă revendicat — răspunsul "pending" ajunge aici ca eroare
        // (functions.invoke tratează orice status non-2xx ca error), nu ca succes.
        // O eroare izolată de rețea nu trebuie să oprească tot pollingul —
        // încercăm din nou la următorul tick, doar timeout-ul global renunță.
        if (error || !data?.access_token) return;
        exchanged = data;
      } catch (err) {
        console.error('exchange-auth-code failed:', err);
        return;
      }
      if (!exchanged) return;

      // Codul e ars pe server la acest punct — indiferent ce urmează, n-are
      // rost să continuăm pollingul cu el.
      stopPolling();

      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: exchanged.access_token,
          refresh_token: exchanged.refresh_token,
        });
        if (sessionError) throw sessionError;

        setStatus('success');
        // '/' e Discover — '/library' e de fapt My Sounds, în ciuda numelui.
        setTimeout(() => navigate('/'), 800);
      } catch (err) {
        console.error('setSession failed:', err);
        setStatus('error');
      }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setStatus('timeout');
    }, TIMEOUT_MS);
  };

  const handleStart = async () => {
    const newCode = generateCode();
    setCode(newCode);
    setStatus('waiting');
    setLinkCopied(false);

    try {
      await open(`${WEBSITE_URL}/app-login?code=${newCode}`);
    } catch (err) {
      console.error('Failed to open browser:', err);
      // Nu e fatal — link-ul rămâne disponibil de copiat manual mai jos.
    }

    pollForSession(newCode);
  };

  const handleCancel = () => {
    stopPolling();
    setStatus('idle');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${WEBSITE_URL}/app-login?code=${code}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container glass">
        <div className="auth-logo">🎹</div>
        <h2>{t('auth_heading')}</h2>

        {status === 'idle' && (
          <>
            <p className="auth-desc">{t('auth_desc')}</p>
            <button className="auth-btn" onClick={handleStart}>
              <LogIn size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              {t('auth_btn_start')}
            </button>
          </>
        )}

        {(status === 'waiting' || status === 'timeout') && (
          <>
            <div className="auth-waiting">
              {status === 'waiting' && <Loader2 size={28} className="spin" />}
              <p>{status === 'timeout' ? t('auth_timeout') : t('auth_waiting')}</p>
            </div>

            <p className="auth-manual-hint">{t('auth_open_manually')}</p>
            <div className="auth-link-box" onClick={handleCopyLink} title={t('auth_open_manually')}>
              <span>{`${WEBSITE_URL}/app-login?code=${code.slice(0, 12)}…`}</span>
              {linkCopied ? <Check size={16} /> : <Copy size={16} />}
            </div>
            {linkCopied && <p className="auth-copied">{t('auth_link_copied')}</p>}

            <div className="auth-actions">
              {status === 'timeout' && (
                <button className="auth-btn" onClick={handleStart}>{t('auth_retry')}</button>
              )}
              <button className="auth-btn-secondary" onClick={handleCancel}>{t('auth_cancel')}</button>
            </div>
          </>
        )}

        {status === 'success' && (
          <div className="auth-waiting">
            <Loader2 size={28} className="spin" />
            <p>{t('auth_success')}</p>
          </div>
        )}

        {status === 'error' && (
          <>
            <p className="error-message">{t('auth_error')}</p>
            <button className="auth-btn" onClick={handleStart}>{t('auth_retry')}</button>
          </>
        )}
      </div>
    </div>
  );
};
