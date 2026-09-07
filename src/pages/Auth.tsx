import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import './Auth.css';

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<HCaptcha>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Un token hCaptcha e de unică folosință — resetăm widget-ul de fiecare
  // dată când userul schimbă între login/signup, ca să nu rămână unul expirat.
  useEffect(() => {
    setCaptchaToken('');
    captchaRef.current?.resetCaptcha();
  }, [isLogin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError('Te rugăm să confirmi captcha-ul.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        });
        if (error) throw error;
        navigate('/library');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Aplicația nu are un origin web real (Tauri rulează pe
            // tauri://localhost) — link-ul de confirmare din email trebuie
            // trimis explicit către pagina de pe site.
            emailRedirectTo: 'https://beatsly.vercel.app/email-confirmed',
            captchaToken,
          },
        });
        if (error) throw error;
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setCaptchaToken('');
      captchaRef.current?.resetCaptcha();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container glass">
        <div className="auth-logo">🎹</div>
        <h2>{isLogin ? t('welcome_back') : t('create_account')}</h2>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          <div className="form-group">
            <label>{t('email')}</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>{t('password')}</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '...' : (isLogin ? t('sign_in') : t('sign_up'))}
          </button>
        </form>

        <p className="toggle-text">
          {isLogin ? t('no_account') : t('have_account')}{' '}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? t('sign_up') : t('sign_in')}
          </span>
        </p>
      </div>
    </div>
  );
};
