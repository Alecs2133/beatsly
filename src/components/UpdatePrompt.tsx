import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Loader2, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import { canSelfUpdate, DOWNLOAD_PAGE, findUpdate, installUpdate, Update } from '../lib/updater';
import { reportError } from '../lib/errorReporting';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Verifică o singură dată, la pornire. Fără asta, un update ajungea la user
 * doar dacă intra el singur în Options și apăsa "Check" — practic niciodată.
 */
export const UpdatePrompt: React.FC = () => {
  const [update, setUpdate] = useState<Update | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  // Pe Linux instalat din .deb/.rpm nu ne putem înlocui singuri — acolo
  // trimitem userul să descarce, în loc să-i promitem un update care eșuează.
  const [selfUpdate, setSelfUpdate] = useState(true);
  const { showToast } = useAppStore();
  const { t } = useTranslation();

  useEffect(() => {
    findUpdate()
      .then(setUpdate)
      // Silențios: fără rețea sau în `tauri dev` nu vrem un toast de eroare
      // la fiecare pornire. Butonul din Options raportează eroarea explicit.
      .catch((err) => console.warn('Startup update check failed:', err));
    canSelfUpdate().then(setSelfUpdate);
  }, []);

  if (!update || dismissed) return null;

  const handleDownload = () => {
    open(DOWNLOAD_PAGE).catch((err) => console.error('open download page:', err));
    setDismissed(true);
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await installUpdate(update, setProgress);
    } catch (err) {
      reportError('updater.install', err);
      showToast(t('update_failed'), 'error');
      setInstalling(false);
      setProgress(null);
    }
  };

  return (
    <div className="glass" style={{
      position: 'fixed', right: 24, bottom: 110, zIndex: 9000, width: 320,
      padding: 18, borderRadius: 14, border: '1px solid var(--border-strong)',
      boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
    }}>
      {!installing && (
        <button
          onClick={() => setDismissed(true)}
          title={t('update_later')}
          style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      )}
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('update_ready_title')} — v{update.version}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
        {!selfUpdate
          ? t('update_manual_desc')
          : installing
            ? `${t('update_installing')}${progress !== null ? ` ${progress}%` : ''}`
            : t('update_ready_desc')}
      </div>
      <button
        onClick={selfUpdate ? handleInstall : handleDownload}
        disabled={installing}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'var(--gradient-primary)', color: 'white', border: 'none',
          padding: '10px', borderRadius: 10, fontWeight: 'bold', cursor: installing ? 'wait' : 'pointer',
        }}
      >
        {!selfUpdate ? <ExternalLink size={16} /> : installing ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
        {selfUpdate ? t('update_install') : t('update_manual_open')}
      </button>
    </div>
  );
};
