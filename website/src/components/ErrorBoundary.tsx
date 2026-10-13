import React from 'react';
import { reportError } from '../lib/errorReporting';
import { I18nContext, type I18n } from '../i18n/context';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  static contextType = I18nContext;
  declare context: I18n;
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(`React render: ${info.componentStack?.slice(0, 150) ?? 'unknown'}`, error);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.context;
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: 'var(--bg-dark)', color: 'white', padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40 }}>😵</div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{t('error_title')}</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: 400 }}>
            {t('error_text')}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--gradient-primary)', color: 'white', border: 'none',
              padding: '12px 28px', borderRadius: 24, fontWeight: 'bold', cursor: 'pointer', marginTop: 8,
            }}
          >
            {t('error_reload')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
