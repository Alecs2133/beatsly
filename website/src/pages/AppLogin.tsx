import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle, LogIn } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useLayoutContext } from '../Layout';
import { PENDING_APP_CODE_KEY, submitPendingAppAuthCode } from '../lib/appHandoff';

const ERROR_STYLE = {
  color: '#ff6b6b',
  background: 'rgba(255, 107, 107, 0.08)',
  borderColor: 'rgba(255, 107, 107, 0.25)',
};

type Status = 'no-code' | 'need-login' | 'submitting' | 'done' | 'error';

export function AppLogin() {
  const { user, requestAuth } = useLayoutContext();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const submittedRef = useRef(false);
  const [status, setStatus] = useState<Status>(code ? 'need-login' : 'no-code');

  // Ținem codul și dacă userul trebuie să-și confirme emailul întâi —
  // /email-confirmed termină handoff-ul mai târziu, citind aceeași cheie.
  useEffect(() => {
    if (code) localStorage.setItem(PENDING_APP_CODE_KEY, code);
  }, [code]);

  useEffect(() => {
    if (!code) return;
    if (!user) {
      setStatus('need-login');
      return;
    }
    if (submittedRef.current) return;
    submittedRef.current = true;
    setStatus('submitting');
    submitPendingAppAuthCode()
      .then((submitted) => setStatus(submitted ? 'done' : 'error'))
      .catch((err) => {
        console.error('submitPendingAppAuthCode failed:', err);
        setStatus('error');
      });
  }, [user, code]);

  const retry = () => {
    submittedRef.current = false;
    setStatus('submitting');
    submitPendingAppAuthCode()
      .then((submitted) => setStatus(submitted ? 'done' : 'error'))
      .catch(() => setStatus('error'));
  };

  if (!code) {
    return (
      <header className="page-intro">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 className="page-title" variants={fadeInUp}>
            Nothing to <span className="glow-text">connect</span>
          </motion.h1>
          <motion.p className="page-subtitle" variants={fadeInUp}>
            This page is meant to be opened from the Beats.ly app's sign-in screen.
          </motion.p>
          <motion.div variants={fadeInUp} style={{ marginTop: 28 }}>
            <Link to="/" className="btn btn-secondary glass-btn">Back to Home</Link>
          </motion.div>
        </motion.div>
      </header>
    );
  }

  const failed = status === 'error';

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
            <>App <span className="glow-text">connected</span></>
          ) : failed ? (
            <>Connection <span className="glow-text">failed</span></>
          ) : (
            <>Sign in to <span className="glow-text">Beats.ly</span></>
          )}
        </motion.h1>

        <motion.p className="page-subtitle" variants={fadeInUp}>
          {status === 'done' && "You're all set — go back to the Beats.ly app, it should sign you in automatically."}
          {status === 'submitting' && 'Connecting your account…'}
          {status === 'need-login' && 'Sign in below to connect your desktop app. This tab will finish automatically.'}
          {failed && "Couldn't connect the app to this account. Go back to the app and try again."}
        </motion.p>

        <motion.div variants={fadeInUp} style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {status === 'need-login' && (
            <button onClick={requestAuth} className="btn btn-primary">Sign In</button>
          )}
          {status === 'submitting' && <Loader2 size={24} className="spin" />}
          {failed && (
            <button onClick={retry} className="btn btn-primary">Try Again</button>
          )}
          {(status === 'done' || failed) && (
            <Link to="/" className="btn btn-secondary glass-btn">Back to Home</Link>
          )}
        </motion.div>
      </motion.div>
    </header>
  );
}
