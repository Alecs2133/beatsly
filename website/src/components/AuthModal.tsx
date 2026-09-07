import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Loader2, Music } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { supabase } from '../lib/supabase';
import './AuthModal.css';

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { email: string; id: string }) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<HCaptcha>(null);

  const reset = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setError('');
    setSuccessMsg('');
    setCaptchaToken('');
    captchaRef.current?.resetCaptcha();
  };

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    reset();
  };

  // Resetăm widget-ul la închiderea modalului — un token hCaptcha e de unică
  // folosință, deci unul rămas din încercarea trecută n-ar mai fi valid oricum.
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError('Please complete the captcha.');
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
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/email-confirmed`,
            captchaToken,
          }
        });
        if (error) throw error;
        if (data.user) {
          setSuccessMsg('Account created! Please check your email to verify your account.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
    } finally {
      setLoading(false);
      // Token-ul e consumat indiferent de rezultat — Supabase îl invalidează
      // după prima verificare, reușită sau nu.
      setCaptchaToken('');
      captchaRef.current?.resetCaptcha();
    }
  };

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
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
          >
            <button className="auth-close" onClick={onClose}><X size={20} /></button>

            <div className="auth-logo">
              <div className="auth-logo-icon"><Music size={28} /></div>
              <span>Beats.ly</span>
            </div>

            <div className="auth-tabs">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign In</button>
              <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Sign Up</button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'signup' && (
                <div className="auth-field">
                  <User size={16} />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="auth-field">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <Lock size={16} />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

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
                {loading ? <Loader2 size={18} className="spin" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <p className="auth-footer-text">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
