import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, UserCircle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface NavbarProps {
  user: User | null;
  scrolled: boolean;
  onSignOut: () => void;
  onRequestAuth: () => void;
}

const NAV_LINK_CLASS = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined);

export function Navbar({ user, scrolled, onSignOut, onRequestAuth }: NavbarProps) {
  return (
    <nav className={`navbar ${scrolled ? 'glass scrolled' : 'transparent'}`}>
      {/* Click pe logo sau pe "Beats.ly" duce mereu la pagina principală. */}
      <Link to="/" className="nav-brand">
        <div className="logo-icon"><img src="/app-icon.png" alt="Beats.ly Logo" /></div>
        <span className="logo-text">Beats.ly</span>
      </Link>

      <div className="nav-links">
        <Link to="/#features">Features</Link>
        <NavLink to="/pricing" className={NAV_LINK_CLASS}>
          {({ isActive }) => (
            <>
              Pricing
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
        <NavLink to="/download" className={NAV_LINK_CLASS}>
          {({ isActive }) => (
            <>
              Download
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
      </div>

      <div className="nav-actions">
        {user ? (
          <div className="nav-user">
            <UserCircle size={20} />
            <span>{user.email?.split('@')[0]}</span>
            <button onClick={onSignOut} className="btn-icon" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={onRequestAuth} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }}>
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
