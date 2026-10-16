
import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { Dock } from './components/Dock';
import { SettingsSheet } from './components/SettingsSheet';
import { CommandPalette } from './components/CommandPalette';
import { usePlayerStore } from './store/usePlayerStore';
import { useAppStore } from './store/useAppStore';
import { keyHue } from './lib/keyColor';
import { ToastContainer } from './components/ToastContainer';
import { LoadingScreen } from './components/LoadingScreen';

const BOOT_STARTED = performance.now();
const MIN_SPLASH_MS = 450;
import { useAuthStore } from './store/useAuthStore';
import { useLibraryStore } from './store/useLibraryStore';
import { isAdminRole, isPublisherRole } from './lib/roles';
import { WelcomeTour } from './components/WelcomeTour';
import { ComingSoon } from './components/ComingSoon';
import { UpdatePrompt } from './components/UpdatePrompt';
import { FEATURES } from './lib/features';
import './design.css';

// Lazy loaded pages for performance
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const Analyzer = lazy(() => import('./pages/Analyzer').then(m => ({ default: m.Analyzer })));
const Auth = lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const MySounds = lazy(() => import('./pages/MySounds').then(m => ({ default: m.MySounds })));
const LocalFiles = lazy(() => import('./pages/LocalFiles').then(m => ({ default: m.LocalFiles })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Account = lazy(() => import('./pages/Account').then(m => ({ default: m.Account })));
const Packs = lazy(() => import('./pages/Packs').then(m => ({ default: m.Packs })));
const PackDetails = lazy(() => import('./pages/PackDetails').then(m => ({ default: m.PackDetails })));
const CrewPage = lazy(() => import('./pages/Crew').then(m => ({ default: m.CrewPage })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

const RouteFallback = () => (
  <div style={{ padding: 40, color: 'var(--text-muted)' }}>…</div>
);

/** /options nu mai e o pagină: deschide panoul de setări peste Descoperă. */
const OptionsRedirect = () => {
  const setSettingsOpen = useAppStore(s => s.setSettingsOpen);
  useEffect(() => { setSettingsOpen(true); }, [setSettingsOpen]);
  return <Navigate to="/" replace />;
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, initialized } = useAuthStore();

  if (!initialized) return <RouteFallback />;
  if (!session) return <Navigate to="/auth" replace />;

  return children;
};

/**
 * Guard bazat pe rol. Rolul vine din `profile.role` (coloană în DB, protejată
 * de RLS), nu din `user_metadata` — acela e scriptibil de utilizator.
 *
 * Așteptăm încărcarea profilului înainte de a decide, altfel un user legitim
 * ar fi redirectat în fereastra dintre autentificare și sosirea profilului.
 */
const RoleRoute = ({
  children,
  allow,
}: {
  children: JSX.Element;
  allow: (role?: string | null) => boolean;
}) => {
  const { session, profile, initialized } = useAuthStore();

  if (!initialized) return <RouteFallback />;
  if (!session) return <Navigate to="/auth" replace />;
  if (!profile) return <RouteFallback />;
  if (!allow(profile.role)) return <Navigate to="/" replace />;

  return children;
};

const PublisherRoute = ({ children }: { children: JSX.Element }) => (
  <RoleRoute allow={isPublisherRole}>{children}</RoleRoute>
);

const AdminRoute = ({ children }: { children: JSX.Element }) => (
  <RoleRoute allow={isAdminRole}>{children}</RoleRoute>
);


const PAGE_TITLES: Record<string, string> = {
  '/': 'beats.ly – Discover Sounds',
  '/auth': 'Sign In – beats.ly',
  '/library': 'My Sounds – beats.ly',
  '/analyzer': 'AI Generator – beats.ly',
  '/local': 'Local Files – beats.ly',
  '/store': 'Store – beats.ly',
  '/admin': 'Admin – beats.ly',
  '/account': 'Profile – beats.ly',
  '/options': 'Settings – beats.ly',
  '/packs': 'Sound Packs – beats.ly',
  '/crew': 'Crew – beats.ly',
};

const AppContent = () => {
  const { initialize, user, profile, initialized } = useAuthStore();
  const { fetchLibrary } = useLibraryStore();
  const location = useLocation();
  const [appReady, setAppReady] = useState(false);
  const [tourDismissed, setTourDismissed] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      fetchLibrary();
    }
  }, [user, fetchLibrary]);

  // Ecranul de pornire stă cât se citește sesiunea — plus un minim scurt,
  // ca să nu clipească pe un PC rapid. Înainte era o pauză fixă de 2,5 s.
  useEffect(() => {
    if (!initialized) return;
    const elapsed = performance.now() - BOOT_STARTED;
    const timer = setTimeout(() => setAppReady(true), Math.max(0, MIN_SPLASH_MS - elapsed));
    return () => clearTimeout(timer);
  }, [initialized]);

  // Fundalul ambiental ia nuanța tonalității sunetului care cântă.
  const currentKey = usePlayerStore(s => s.currentTrack?.key);
  useEffect(() => {
    const hue = keyHue(currentKey);
    document.documentElement.style.setProperty('--tint', String(hue ?? 255));
  }, [currentKey]);

  // Dynamic page title
  useEffect(() => {
    // Handle /pack/:tag route
    if (location.pathname.startsWith('/pack/')) {
      const tag = location.pathname.split('/pack/')[1];
      const formatted = tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : '';
      document.title = formatted ? `${formatted} Pack – beats.ly` : 'beats.ly';
    } else {
      document.title = PAGE_TITLES[location.pathname] ?? 'beats.ly';
    }
  }, [location.pathname]);

  return (
    <>
      <LoadingScreen isReady={appReady} />
      <div className="app-container">
      <div className="app-ambient" aria-hidden />
      <div className="main-wrapper">
        <TopBar />
        <main className="main-content">
          <Suspense fallback={<RouteFallback />}>
            <Routes key={location.pathname}>
              <Route path="/" element={<Library />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/library" element={<ProtectedRoute><MySounds /></ProtectedRoute>} />
              <Route
                path="/analyzer"
                element={FEATURES.aiGenerator ? <ProtectedRoute><Analyzer /></ProtectedRoute> : <ComingSoon feature="AI Generator" />}
              />
              <Route path="/local" element={<PublisherRoute><LocalFiles /></PublisherRoute>} />
              <Route path="/store" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
              <Route path="/options" element={<OptionsRedirect />} />
              <Route path="/packs" element={<ProtectedRoute><Packs /></ProtectedRoute>} />
              <Route path="/pack/:tag" element={<ProtectedRoute><PackDetails /></ProtectedRoute>} />
              <Route path="/crew" element={<ProtectedRoute><CrewPage /></ProtectedRoute>} />
              <Route path="/producer/:userId" element={<Profile />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <Dock />
      <SettingsSheet />
      <CommandPalette />
      <ToastContainer />
      {appReady && <UpdatePrompt />}
      {appReady && user && profile && !profile.onboarded_at && !tourDismissed && (
        <WelcomeTour userId={user.id} onDone={() => setTourDismissed(true)} />
      )}
    </div>
    </>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}