import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { useT } from '../i18n/context';
import './CookieBanner.css';

// Notificare informativă, nu cerere de consimțământ: site-ul folosește doar
// stocare strict necesară (sesiune, limbă, anti-spam), pentru care legea nu
// cere acord. Vechiul banner cu „Accept / Decline” promitea o alegere care
// nu schimba nimic și menționa analiză de trafic pe care nu o facem.
const STORAGE_KEY = 'beatsly_cookie_notice_seen';

export function CookieBanner() {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage blocat — arătăm notificarea, n-o putem memora oricum
    }
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignorăm — notificarea se închide oricum pentru sesiunea curentă
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="cookie-banner glass"
          role="region"
          aria-label="Cookies"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
        >
          <div className="cookie-icon"><Cookie size={24} /></div>
          <div className="cookie-text">
            <p>
              {t('cookie_text')}{' '}
              <Link to="/legal/cookies" onClick={dismiss}>{t('cookie_learn_more')}</Link>
            </p>
          </div>
          <div className="cookie-actions">
            <button onClick={dismiss} className="btn-cookie-accept">
              {t('cookie_ok')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
