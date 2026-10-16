import { useEffect, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type { LayoutContext } from './lib/layoutContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { CookieBanner } from './components/CookieBanner';

/**
 * Scroll la fiecare navigare: sus de tot, sau la secțiunea cerută prin
 * `state.section` (link-ul „FAQ” din footer și de pe Prețuri — vezi SectionLink).
 *
 * Secțiunea vine prin `state`, nu prin `#hash` în URL: un hash rămânea în
 * bara de adrese, iar la refresh sau la redeschiderea site-ului pagina pornea
 * derulată în jos, la secțiunea respectivă.
 *
 * `useLayoutEffect` + `location.key`: scroll-ul se face înainte ca noua pagină
 * să fie desenată (fără salt vizibil), și la fiecare click — inclusiv un al
 * doilea click pe „Features” când ești deja pe Home.
 */
function ScrollManager() {
  const location = useLocation();
  const section = (location.state as { section?: string } | null)?.section;

  useLayoutEffect(() => {
    if (!section) {
      window.scrollTo(0, 0);
      return;
    }

    let raf = 0;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(section);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (++attempts < 60) raf = requestAnimationFrame(tryScroll);
    };
    tryScroll();
    return () => cancelAnimationFrame(raf);
  }, [location.key, section]);

  return null;
}

export function Layout() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // Până nu știm dacă există o sesiune, nu afișăm nici „Sign In”, nici
  // userul — altfel butonul clipea la fiecare refresh pentru cine e logat.
  const [authReady, setAuthReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
  };

  const context: LayoutContext = {
    user,
    authReady,
    requestAuth: () => setAuthOpen(true),
  };

  return (
    <div className="landing-container">

      <Navbar
        user={user}
        authReady={authReady}
        scrolled={scrolled}
        onSignOut={handleSignOut}
        onRequestAuth={() => setAuthOpen(true)}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => setUser({ email: u.email } as User)}
      />

      <ScrollManager />

      {/* Fără animație la nivel de pagină: fiecare pagină își animă deja
          secțiunile (fadeInUp). Două animații suprapuse, plus una de ieșire
          de 250ms, făceau ca pagina să pară că se randează de două ori. */}
      <main key={location.pathname}>
        <Outlet context={context} />
      </main>

      <Footer />
      <CookieBanner />
    </div>
  );
}
