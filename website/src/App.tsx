import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { Home } from './pages/Home';
import { Pricing } from './pages/Pricing';
import { DownloadPage } from './pages/Download';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="download" element={<DownloadPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
