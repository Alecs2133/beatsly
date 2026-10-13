import React from 'react';
import { reportError } from '../lib/errorReporting';
import { translate } from '../hooks/useTranslation';
import { Icon } from './Icon';
import { useAppStore } from '../store/useAppStore';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Fără asta, orice eroare de render arăta ca un ecran alb, complet mort —
 * nici măcar un buton de reload. Acum arată un fallback și trimite eroarea
 * mai departe, în loc să dispară doar în consolă.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(`React render: ${info.componentStack?.slice(0, 150) ?? 'unknown'}`, error);
  }

  render() {
    if (this.state.hasError) {
      // Componentă-clasă, fără hook-uri: citim limba direct din store.
      const lang = useAppStore.getState().language;
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: '#0a0a0f', color: 'white', padding: 40, textAlign: 'center',
        }}>
          <div className="empty-icon"><Icon name="alert" size={26} play={1} /></div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{translate(lang, 'error_title')}</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 400 }}>
            {translate(lang, 'error_text')}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--gradient-primary, linear-gradient(135deg, #8466ff, #7354f5))',
              color: 'white', border: 'none', padding: '12px 28px', borderRadius: 24,
              fontWeight: 'bold', cursor: 'pointer', marginTop: 8,
            }}
          >
            {translate(lang, 'error_reload')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
