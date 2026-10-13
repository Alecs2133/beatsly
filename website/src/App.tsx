import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { Home } from './pages/Home';
import { Pricing } from './pages/Pricing';
import { DownloadPage } from './pages/Download';
import { Profile } from './pages/Profile';
import { EmailConfirmed } from './pages/EmailConfirmed';
import { AppLogin } from './pages/AppLogin';
import { LegalPage } from './pages/LegalPage';
import './App.css';

/**
 * `/account` a devenit `/profile`. Redirecționăm păstrând query-ul: Stripe
 * trimite userii înapoi la `/account?checkout=success` (create-checkout).
 */
function AccountRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (!params.has('section')) params.set('section', 'subscription');
  return <Navigate to={`/profile?${params.toString()}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="download" element={<DownloadPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="account" element={<AccountRedirect />} />
          <Route path="email-confirmed" element={<EmailConfirmed />} />
          <Route path="app-login" element={<AppLogin />} />
          <Route path="legal/:doc" element={<LegalPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
