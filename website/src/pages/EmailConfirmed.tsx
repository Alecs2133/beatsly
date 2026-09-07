import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useLayoutContext } from '../Layout';
import { submitPendingAppAuthCode } from '../lib/appHandoff';

const ERROR_STYLE = {
  color: '#ff6b6b',
  background: 'rgba(255, 107, 107, 0.08)',
  borderColor: 'rgba(255, 107, 107, 0.25)',
};

export function EmailConfirmed() {
  const { user } = useLayoutContext();
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

  // Layout-ul de deasupra citește sesiunea din URL la montare — durează o
  // clipă. Așteptăm puțin înainte să tratăm lipsa userului ca stare finală,
  // ca să nu arătăm "neconfirmat" fals cât timp sesiunea încă se stabilește.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user || appHandoffAttempted.current) return;
    appHandoffAttempted.current = true;
    submitPendingAppAuthCode()
      .then(setAppConnected)
      .catch((err) => console.error('submitPendingAppAuthCode failed:', err));
  }, [user]);

  const failed = !!errorDescription;

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
            <>Link <span className="glow-text">expired</span></>
          ) : (
            <>Email <span className="glow-text">confirmed</span></>
          )}
        </motion.h1>

        <motion.p className="page-subtitle" variants={fadeInUp}>
          {failed
            ? errorDescription || 'This confirmation link is invalid or has expired. Try signing up again to get a new one.'
            : !settled && !user
              ? 'Confirming your email…'
              : appConnected
                ? `Your account is verified${user?.email ? ` — ${user.email}` : ''}. The Beats.ly app has been connected automatically — you can go back to it now.`
                : `Your account is verified${user?.email ? ` — ${user.email}` : ''}. You can close this tab now.`}
        </motion.p>

        <motion.div
          variants={fadeInUp}
          style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          {failed ? (
            <Link to="/" className="btn btn-secondary glass-btn">Back to Home</Link>
          ) : (
            <>
              <Link to="/download" className="btn btn-primary">Download the App</Link>
              <Link to="/" className="btn btn-secondary glass-btn">Back to Home</Link>
            </>
          )}
        </motion.div>
      </motion.div>
    </header>
  );
}
