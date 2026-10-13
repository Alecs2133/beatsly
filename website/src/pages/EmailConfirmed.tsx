import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useLayoutContext } from '../lib/layoutContext';
import { submitPendingAppAuthCode } from '../lib/appHandoff';
import { useT } from '../i18n/context';

const ERROR_STYLE = {
  color: '#ff6b6b',
  background: 'rgba(255, 107, 107, 0.08)',
  borderColor: 'rgba(255, 107, 107, 0.25)',
};

export function EmailConfirmed() {
  const { t } = useT();
  const { user, authReady } = useLayoutContext();
  const [searchParams] = useSearchParams();

  // Doar dacă userul a pornit signup-ul din /app-login (deci aplicația
  // desktop încă așteaptă un cod) — pentru oricine confirmă emailul normal,
  // de pe site, asta rămâne mereu false și nu schimbă nimic din mesaj.
  const appHandoffAttempted = useRef(false);
  const [appConnected, setAppConnected] = useState(false);

  // Supabase redirects erori fie ca query string, fie ca hash fragment,
  // în funcție de tipul de link — verificăm ambele ca să nu ratăm mesajul.
  const hashParams = useMemo(() => new URLSearchParams(window.location.hash.slice(1)), []);
  const errorDescription =
    searchParams.get('error_description') || hashParams.get('error_description');

  useEffect(() => {
    if (!user || appHandoffAttempted.current) return;
    appHandoffAttempted.current = true;
    submitPendingAppAuthCode()
      .then(setAppConnected)
      .catch((err) => console.error('submitPendingAppAuthCode failed:', err));
  }, [user]);

  const failed = !!errorDescription;
  const emailSuffix = user?.email ? ` — ${user.email}` : '';

  return (
    <header className="page-intro">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
        <motion.div
          variants={fadeInUp}
          className="account-lock-icon"
          style={failed ? ERROR_STYLE : undefined}
        >
          {failed ? <XCircle size={28} /> : <CheckCircle2 size={28} />}
        </motion.div>

        <motion.h1 className="page-title" variants={fadeInUp}>
          {failed ? (
            <>{t('email_expired_title_1')} <span className="glow-text">{t('email_expired_title_2')}</span></>
          ) : (
            <>{t('email_confirmed_title_1')} <span className="glow-text">{t('email_confirmed_title_2')}</span></>
          )}
        </motion.h1>

        <motion.p className="page-subtitle" variants={fadeInUp}>
          {failed
            ? errorDescription || t('email_expired_text')
            : !authReady
              ? t('email_confirming')
              : appConnected
                ? t('email_verified_app', { email: emailSuffix })
                : t('email_verified', { email: emailSuffix })}
        </motion.p>

        <motion.div
          variants={fadeInUp}
          style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          {!failed && (
            <Link to="/download" className="btn btn-primary">{t('common_download_app')}</Link>
          )}
          <Link to="/" className="btn btn-secondary glass-btn">{t('common_back_home')}</Link>
        </motion.div>
      </motion.div>
    </header>
  );
}
