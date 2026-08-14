import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Shield } from 'lucide-react';
import './CookieBanner.css';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('beatsly_cookies_accepted');
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('beatsly_cookies_accepted', 'true');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('beatsly_cookies_accepted', 'false');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="cookie-banner glass"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
        >
          <div className="cookie-icon"><Cookie size={24} /></div>
          <div className="cookie-text">
            <p><strong>We use cookies</strong> to improve your experience and analyze site traffic. By clicking "Accept", you consent to our use of cookies.</p>
          </div>
          <div className="cookie-actions">
            <button onClick={decline} className="btn-cookie-decline">
              <X size={14} /> Decline
            </button>
            <button onClick={accept} className="btn-cookie-accept">
              <Shield size={14} /> Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
