import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AudioPlayer } from './components/AudioPlayer';
import { ToastContainer } from './components/ToastContainer';
import { Library } from './pages/Library'; 
import { Analyzer } from './pages/Analyzer';
import { Auth } from './pages/Auth';
import { MySounds } from './pages/MySounds';
import { LocalFiles } from './pages/LocalFiles';
import { Pricing } from './pages/Pricing';
import { Admin } from './pages/Admin';
import { Account } from './pages/Account';
import { Options } from './pages/Options';
import { LoadingScreen } from './components/LoadingScreen';
import { useTranslation } from './hooks/useTranslation';
import { PlayerProvider } from './context/PlayerContext';
import { useAuthStore } from './store/useAuthStore';
import { useLibraryStore } from './store/useLibraryStore';
import './design.css';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, initialized } = useAuthStore();
  
  if (!initialized) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  
  return children;
};

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { session, initialized } = useAuthStore();
  
  if (!initialized) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  
  const role = session.user.user_metadata?.role;
  const isAuthorized = role === 'PRODUCER' || role === 'VIDEO MAKER' || role === 'PRODUCER ADMIN' || role === 'OWNER';
  
  if (!isAuthorized) return <Navigate to="/" replace />;
  
  return children;
};

const UltimateRoute = ({ children }: { children: JSX.Element }) => {
  const { session, profile, initialized } = useAuthStore();
  const { t } = useTranslation();
  
  if (!initialized || !profile) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  
  const isOwner = session.user.user_metadata?.role === 'OWNER';
  
  if (profile.tier !== 'ultimate' && !isOwner) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--accent-primary)', marginBottom: '20px' }}>{t('ultimate_required')}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{t('ultimate_desc')}</p>
        <p style={{ marginTop: '20px' }}>
          <Link to="/store" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>{t('upgrade_store')}</Link>
        </p>
      </div>
    );
  }
  
  return children;
};

const AppContent = () => {
  const { initialize, user, initialized } = useAuthStore();
  const { fetchLibrary } = useLibraryStore();
  const location = useLocation();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      fetchLibrary();
    }
  }, [user, fetchLibrary]);

  useEffect(() => {
    if (initialized) {
      const timer = setTimeout(() => {
        setAppReady(true);
      }, 2500); // Give the loading screen time to play animation
      return () => clearTimeout(timer);
    }
  }, [initialized]);

  const hideLayout = location.pathname === '/options' || location.pathname === '/account';

  return (
    <>
      <LoadingScreen isReady={appReady} />
      <div className="app-container">
      {!hideLayout && <Sidebar />}
      
      <div className={hideLayout ? "" : "main-wrapper"} style={hideLayout ? { flex: 1, display: 'flex' } : {}}>
        {!hideLayout && <TopBar />}
        <main className={hideLayout ? "full-page-wrapper" : "main-content"} style={hideLayout ? { flex: 1, display: 'flex' } : {}}>
          <Routes key={location.pathname}>
            <Route path="/" element={<Library />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/library" element={<ProtectedRoute><MySounds /></ProtectedRoute>} />
            <Route path="/analyzer" element={<UltimateRoute><Analyzer /></UltimateRoute>} />
            <Route path="/local" element={<AdminRoute><LocalFiles /></AdminRoute>} />
            <Route path="/store" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/options" element={<Options />} />
          </Routes>
        </main>
      </div>

      {!hideLayout && <AudioPlayer />}
      <ToastContainer />
    </div>
    </>
  );
};

export default function App() {
  return (
    <Router>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </Router>
  );
}