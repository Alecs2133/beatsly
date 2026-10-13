import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle, LogIn } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useLayoutContext } from '../lib/layoutContext';
import { PENDING_APP_CODE_KEY, SessionExpiredError, submitPendingAppAuthCode } from '../lib/appHandoff';
import { useT } from '../i18n/context';

const ERROR_STYLE = {
  color: '#ff6b6b',
  background: 'rgba(255, 107, 107, 0.08)',
  borderColor: 'rgba(255, 107, 107, 0.25)',
};

type Status = 'no-code' | 'checking' | 'need-login' | 'submitting' | 'done' | 'error';

export function AppLogin() {
  const { t } = useT();
  const { user, authReady, requestAuth } = useLayoutContext();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const submittedRef = useRef(false);
  // `checking` până se citește sesiunea — altfel cine e deja logat vedea o
  // clipă ecranul „Sign in” înainte ca handoff-ul să pornească.
  const [status, setStatus] = useState<Status>(code ? 'checking' : 'no-code');

  // Ținem codul și dacă userul trebuie să-și confirme emailul întâi —
  // /email-confirmed termină handoff-ul mai târziu, citind aceeași cheie.
  useEffect(() => {
    if (code) localStorage.setItem(PENDING_APP_CODE_KEY, code);
  }, [code]);

  useEffect(() => {
    if (!code || !authReady) return;
    if (!user) {
      setStatus('need-login');
      return;
    }
    if (submittedRef.current) return;
    submit();
    // `submit` e recreat la fiecare randare, dar citește doar ref-uri și setteri stabili.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, code, authReady]);

  const submit = () => {
    submittedRef.current = true;
    setStatus('submitting');
    submitPendingAppAuthCode()
      .then((submitted) => setStatus(submitted ? 'done' : 'error'))
      .catch((err) => {
        // Sesiune moartă pe server: am delogat deja local, deci `user`
        // devine null și pagina cere login din nou; după login, efectul de
        // mai sus retrimite automat.
        if (err instanceof SessionExpiredError) {
          submittedRef.current = false;
          setStatus('need-login');
          return;
        }
        console.error('submitPendingAppAuthCode failed:', err);
        setStatus('error');
      });
  };

  if (!code) {
    return (
      <header className="page-intro">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 className="page-title" variants={fadeInUp}>
            {t('applogin_nothing_title_1')} <span className="glow-text">{t('applogin_nothing_title_2')}</span>
          </motion.h1>
          <motion.p className="page-subtitle" variants={fadeInUp}>
            {t('applogin_nothing_text')}
          </motion.p>
          <motion.div variants={fadeInUp} style={{ marginTop: 28 }}>
            <Link to="/" className="btn btn-secondary glass-btn">{t('common_back_home')}</Link>
          </motion.div>
        </motion.div>
      </header>
    );
  }

  const failed = status === 'error';
  const busy = status === 'checking' || status === 'submitting';

  return (
    <header className="page-intro">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
        <motion.div
          variants={fadeInUp}
          className="account-lock-icon"
          style={failed ? ERROR_STYLE : undefined}
        >
          {status === 'done' ? <CheckCircle2 size={28} /> : failed ? <XCircle size={28} /> : <LogIn size={28} />}
        </motion.div>

        <motion.h1 className="page-title" variants={fadeInUp}>
          {status === 'done' ? (
            <>{t('applogin_connected_title_1')} <span className="glow-text">{t('applogin_connected_title_2')}</span></>
          ) : failed ? (
            <>{t('applogin_failed_title_1')} <span className="glow-text">{t('applogin_failed_title_2')}</span></>
          ) : (
            <>{t('applogin_sign_in_title_1')} <span className="glow-text">Beats.ly</span></>
          )}
        </motion.h1>

        <motion.p className="page-subtitle" variants={fadeInUp}>
          {status === 'done' && t('applogin_done_text')}
          {busy && t('applogin_submitting_text')}
          {status === 'need-login' && t('applogin_need_login_text')}
          {failed && t('applogin_failed_text')}
        </motion.p>

        <motion.div variants={fadeInUp} style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {status === 'need-login' && (
            <button onClick={requestAuth} className="btn btn-primary">{t('common_sign_in')}</button>
          )}
          {busy && <Loader2 size={24} className="spin" />}
          {failed && (
            <button onClick={submit} className="btn btn-primary">{t('common_try_again')}</button>
          )}
          {(status === 'done' || failed) && (
            <Link to="/" className="btn btn-secondary glass-btn">{t('common_back_home')}</Link>
          )}
        </motion.div>
      </motion.div>
    </header>
  );
}
