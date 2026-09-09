import React from 'react';
import { reportError } from '../lib/errorReporting';

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
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: '#0a0a0f', color: 'white', padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40 }}>😵</div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Something went wrong</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 400 }}>
            The app hit an unexpected error. It's been reported — reloading should fix it.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--gradient-primary, linear-gradient(135deg, #b026ff, #00bbf9))',
              color: 'white', border: 'none', padding: '12px 28px', borderRadius: 24,
              fontWeight: 'bold', cursor: 'pointer', marginTop: 8,
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
