import { useEffect, useState } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { pageTransition } from './lib/animations';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { CookieBanner } from './components/CookieBanner';

export interface LayoutContext {
  user: User | null;
  requestAuth: () => void;
}

/** Pagini (Pricing, Download) citesc user/requestAuth prin acest hook. */
export function useLayoutContext() {
  return useOutletContext<LayoutContext>();
}

/**
 * Derulează la secțiunea din hash după navigare (ex: link-ul "Features" din
 * navbar duce la /#features, chiar dacă pornești de pe /pricing), sau
 * resetează scroll-ul la vârf când navighezi către o rută fără hash.
 */
function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0 });
      return;
    }

    // Elementul-țintă (ex: #features de pe Home) poate să nu existe încă în
    // DOM: AnimatePresence rulează întâi ieșirea paginii curente (~250ms)
    // înainte ca noua pagină să se monteze. Reîncercăm la fiecare cadru, până
    // apare sau până la ~1s, în loc să presupunem un număr fix de cadre.
    const id = location.hash.slice(1);
    let raf = 0;
    let attempts = 0;

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      attempts += 1;
      if (attempts < 60) {
        raf = requestAnimationFrame(tryScroll);
      }
    };

    raf = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, location.hash]);

  return null;
}

export function Layout() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const context: LayoutContext = {
    user,
    requestAuth: () => setAuthOpen(true),
  };

  return (
    <div className="landing-container">
      {/* Floating background orbs */}
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />

      <Navbar user={user} scrolled={scrolled} onSignOut={handleSignOut} onRequestAuth={() => setAuthOpen(true)} />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => setUser({ email: u.email } as User)}
      />

      <ScrollManager />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          variants={pageTransition}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <Outlet context={context} />
        </motion.main>
      </AnimatePresence>

      <Footer />
      <CookieBanner />
    </div>
  );
}
