import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, UserCircle, Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface NavbarProps {
  user: User | null;
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

export function Navbar({ user, scrolled, onSignOut, onRequestAuth }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Închide meniul mobil la orice navigare — altfel rămâne deschis peste
  // pagina nouă când userul dă tap pe un link.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

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

  return (
    <nav className={`navbar ${scrolled || menuOpen ? 'glass scrolled' : 'transparent'}`}>
      {/* Click pe logo sau pe "Beats.ly" duce mereu la pagina principală. */}
      <Link to="/" className="nav-brand">
        <div className="logo-icon"><img src="/app-icon.png" alt="Beats.ly Logo" /></div>
        <span className="logo-text">Beats.ly</span>
      </Link>

      <div className="nav-links">
        <Link to="/#features">Features</Link>
        <DesktopNavLink to="/pricing" label="Pricing" />
        <DesktopNavLink to="/download" label="Download" />
      </div>

      <div className="nav-actions">
        {user ? (
          <div className="nav-user">
            {/* Link + buton separate ca frați, nu imbricate — un <button>
                în interiorul unui <a> ar fi HTML invalid și ar da conflicte
                de click. */}
            <Link to="/account" className="nav-user-link">
              <UserCircle size={20} />
              <span>{user.email?.split('@')[0]}</span>
            </Link>
            <button onClick={onSignOut} className="btn-icon" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={onRequestAuth} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }}>
            Sign In
          </button>
        )}

        <button
          type="button"
          className="nav-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
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
            <Link to="/#features">Features</Link>
            <NavLink to="/pricing" className={NAV_LINK_CLASS}>Pricing</NavLink>
            <NavLink to="/download" className={NAV_LINK_CLASS}>Download</NavLink>
            {user && (
              <NavLink to="/account" className={NAV_LINK_CLASS}>Account</NavLink>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
