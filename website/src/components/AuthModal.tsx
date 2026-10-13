import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Loader2, Music } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { supabase } from '../lib/supabase';
import { useT } from '../i18n/context';
import { richText } from '../i18n/rich';
import { LEGAL_VERSION } from '../legal/version';
import './AuthModal.css';

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

type Mode = 'login' | 'signup' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { email: string; id: string }) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<HCaptcha>(null);

  const reset = () => {
    setPassword('');
    setUsername('');
    setAcceptedTerms(false);
    setError('');
    setSuccessMsg('');
    setCaptchaToken('');
    captchaRef.current?.resetCaptcha();
  };

  // Emailul rămâne la schimbarea tab-ului — cine trece de la „Sign In” la
  // „Forgot password” nu trebuie să-l scrie din nou.
  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  // Resetăm widget-ul la închiderea modalului — un token hCaptcha e de unică
  // folosință, deci unul rămas din încercarea trecută n-ar mai fi valid oricum.
  useEffect(() => {
    if (!isOpen) {
      setMode('login');
      setEmail('');
      reset();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup' && !acceptedTerms) {
      setError(t('auth_must_accept'));
      return;
    }
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError(t('auth_captcha_required'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        });
        if (error) throw error;
        if (data.user) {
          onSuccess({ email: data.user.email!, id: data.user.id });
          onClose();
        }
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Dovada acordului: când și ce versiune a documentelor a acceptat.
            data: { username, terms_accepted_at: new Date().toISOString(), terms_version: LEGAL_VERSION },
            emailRedirectTo: `${window.location.origin}/email-confirmed`,
            captchaToken,
          }
        });
        if (error) throw error;
        if (data.user) {
          setSuccessMsg(t('auth_check_email'));
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/profile?section=security`,
          captchaToken,
        });
        if (error) throw error;
        // Același mesaj indiferent dacă emailul există — nu confirmăm cine are cont.
        setSuccessMsg(t('auth_reset_sent'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : t('auth_generic_error'));
    } finally {
      setLoading(false);
      // Token-ul e consumat indiferent de rezultat — Supabase îl invalidează
      // după prima verificare, reușită sau nu.
      setCaptchaToken('');
      captchaRef.current?.resetCaptcha();
    }
  };

  const submitLabel =
    mode === 'login' ? t('auth_sign_in') : mode === 'signup' ? t('auth_create_account') : t('auth_reset_send');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="auth-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="auth-modal glass"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
          >
            <button className="auth-close" onClick={onClose} aria-label={t('common_cancel')}><X size={20} /></button>

            <div className="auth-logo">
              <div className="auth-logo-icon"><Music size={28} /></div>
              <span>Beats.ly</span>
            </div>

            {mode !== 'reset' && (
              <div className="auth-tabs">
                <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>{t('auth_sign_in')}</button>
                <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>{t('auth_sign_up')}</button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'signup' && (
                <div className="auth-field">
                  <User size={16} />
                  <input
                    type="text"
                    placeholder={t('auth_username')}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              )}
              <div className="auth-field">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder={t('auth_email')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              {mode !== 'reset' && (
                <div className="auth-field">
                  <Lock size={16} />
                  <input
                    type="password"
                    placeholder={t('auth_password')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={mode === 'signup' ? 8 : undefined}
                    required
                  />
                </div>
              )}

              {mode === 'login' && (
                <button type="button" className="auth-link-btn" onClick={() => switchMode('reset')}>
                  {t('auth_forgot_password')}
                </button>
              )}

              {mode === 'signup' && (
                <label className="auth-consent">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                  />
                  <span>
                    {richText(t('auth_accept_terms'), {
                      terms: <Link to="/legal/terms" target="_blank">{t('footer_terms')}</Link>,
                      privacy: <Link to="/legal/privacy" target="_blank">{t('footer_privacy')}</Link>,
                    })}
                  </span>
                </label>
              )}

              {HCAPTCHA_SITE_KEY && (
                <div className="auth-captcha">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={HCAPTCHA_SITE_KEY}
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken('')}
                  />
                </div>
              )}

              {error && <div className="auth-error">{error}</div>}
              {successMsg && <div className="auth-success">{successMsg}</div>}

              <button type="submit" className="auth-submit btn btn-primary" disabled={loading}>
                {loading ? <Loader2 size={18} className="spin" /> : submitLabel}
              </button>
            </form>

            <p className="auth-footer-text">
              {mode === 'reset' ? (
                <button onClick={() => switchMode('login')}>{t('auth_back_to_sign_in')}</button>
              ) : (
                <>
                  {mode === 'login' ? t('auth_no_account') : t('auth_have_account')}{' '}
                  <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
                    {mode === 'login' ? t('auth_sign_up') : t('auth_sign_in')}
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
