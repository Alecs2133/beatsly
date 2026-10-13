import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SectionLink } from './SectionLink';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, UserCircle, Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useT } from '../i18n/context';
import { LanguageToggle } from './LanguageToggle';

interface NavbarProps {
  user: User | null;
  authReady: boolean;
  scrolled: boolean;
  onSignOut: () => void;
  onRequestAuth: () => void;
}

const NAV_LINK_CLASS = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined);

/** Link cu pastila animată sub el cât timp e ruta activă. Doar pentru navbar-ul desktop. */
function DesktopNavLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} className={NAV_LINK_CLASS}>
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <motion.span
              layoutId="nav-underline"
              className="nav-underline"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export function Navbar({ user, authReady, scrolled, onSignOut, onRequestAuth }: NavbarProps) {
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Închide meniul mobil la orice navigare — altfel rămâne deschis peste
  // pagina nouă când userul dă tap pe un link.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.key]);

  // Blochează scroll-ul din spatele meniului cât timp e deschis, ca pagina
  // să nu alunece sub el pe telefon.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const displayName =
    (user?.user_metadata?.username as string | undefined) ?? user?.email?.split('@')[0];

  return (
    <nav className={`navbar ${scrolled || menuOpen ? 'glass scrolled' : 'transparent'}`}>
      {/* Click pe logo sau pe "Beats.ly" duce mereu la pagina principală. */}
      <Link to="/" className="nav-brand">
        <div className="logo-icon"><img src="/app-icon.png" alt="Beats.ly Logo" /></div>
        <span className="logo-text">Beats.ly</span>
      </Link>

      <div className="nav-links">
        <SectionLink section="features">{t('nav_features')}</SectionLink>
        <DesktopNavLink to="/pricing" label={t('nav_pricing')} />
        <DesktopNavLink to="/download" label={t('nav_download')} />
      </div>

      <div className="nav-actions">
        <LanguageToggle />

        {/* Până se citește sesiunea nu arătăm nimic aici — altfel „Sign In”
            clipea o clipă la fiecare refresh pentru cine e deja logat. */}
        {!authReady ? (
          <div className="nav-auth-placeholder" aria-hidden />
        ) : user ? (
          <div className="nav-user">
            {/* Link + buton separate ca frați, nu imbricate — un <button>
                în interiorul unui <a> ar fi HTML invalid și ar da conflicte
                de click. */}
            <Link to="/profile" className="nav-user-link">
              <UserCircle size={20} />
              <span>{displayName}</span>
            </Link>
            <button onClick={onSignOut} className="btn-icon" title={t('nav_sign_out')} aria-label={t('nav_sign_out')}>
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={onRequestAuth} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }}>
            {t('nav_sign_in')}
          </button>
        )}

        <button
          type="button"
          className="nav-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? t('nav_close_menu') : t('nav_open_menu')}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="mobile-menu glass"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <SectionLink section="features">{t('nav_features')}</SectionLink>
            <NavLink to="/pricing" className={NAV_LINK_CLASS}>{t('nav_pricing')}</NavLink>
            <NavLink to="/download" className={NAV_LINK_CLASS}>{t('nav_download')}</NavLink>
            {user && (
              <NavLink to="/profile" className={NAV_LINK_CLASS}>{t('nav_profile')}</NavLink>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
