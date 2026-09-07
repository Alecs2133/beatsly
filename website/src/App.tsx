import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { Home } from './pages/Home';
import { Pricing } from './pages/Pricing';
import { DownloadPage } from './pages/Download';
import { Account } from './pages/Account';
import { EmailConfirmed } from './pages/EmailConfirmed';
import { AppLogin } from './pages/AppLogin';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="download" element={<DownloadPage />} />
          <Route path="account" element={<Account />} />
          <Route path="email-confirmed" element={<EmailConfirmed />} />
          <Route path="app-login" element={<AppLogin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
