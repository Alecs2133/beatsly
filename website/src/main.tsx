import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { installGlobalErrorHandlers } from './lib/errorReporting'
import { LanguageProvider } from './i18n/LanguageProvider'

installGlobalErrorHandlers()

// La refresh, browserul încerca să restaureze scroll-ul vechi peste o pagină
// care încă se animă, așa că site-ul pornea „pe la jumătate”. Scroll-ul îl
// gestionăm noi (ScrollManager din Layout): mereu sus la deschidere.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
// Link-urile vechi de tip /#features nu mai derulează pagina la deschidere.
// Doar ancore simple: hash-urile cu `=` (ex. `#access_token=...` din
// emailurile Supabase) trebuie lăsate în pace, le citește clientul de auth.
if (/^#[\w-]+$/.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </LanguageProvider>
  </StrictMode>,
)
