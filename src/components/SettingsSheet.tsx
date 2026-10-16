import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogOut } from 'lucide-react';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';
import { getVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-shell';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { findUpdate, installUpdate } from '../lib/updater';
import { reportError } from '../lib/errorReporting';
import { FEATURES } from '../lib/features';
import { HardwareSwitch } from './controls/HardwareSwitch';
import { Segmented } from './Segmented';
import './SettingsSheet.css';

type UpdateState = 'idle' | 'checking' | 'latest' | 'installing' | 'failed';

/**
 * Setările ca panou de control: se deschid peste ce faci (din dock sau din
 * Ctrl+K), nu ca o pagină separată care te scoate din context.
 */
export const SettingsSheet: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    settingsOpen, setSettingsOpen, language, setLanguage, hoverPreview, setHoverPreview,
    soundView, setSoundView, showToast,
  } = useAppStore();
  const { user, signOut } = useAuthStore();
  const [autostart, setAutostart] = useState(false);
  const [version, setVersion] = useState('');
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    isEnabled().then(setAutostart).catch(() => {});
    getVersion().then(setVersion).catch(() => {});
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, setSettingsOpen]);

  const toggleAutostart = async (on: boolean) => {
    try {
      if (on) await enable(); else await disable();
      setAutostart(on);
      showToast(t(on ? 'autostart_enabled' : 'autostart_disabled'), on ? 'success' : 'info');
    } catch (e) {
      console.error('Failed to toggle autostart', e);
      showToast(t('autostart_failed'), 'error');
    }
  };

  const checkUpdates = async () => {
    setUpdateState('checking');
    let update;
    try {
      update = await findUpdate();
    } catch (e) {
      console.error('Update check failed:', e);
      setUpdateState('failed');
      showToast(t('update_check_failed'), 'error');
      return;
    }
    if (!update) {
      setUpdateState('latest');
      return;
    }
    setUpdateState('installing');
    try {
      await installUpdate(update, setProgress);
    } catch (e) {
      reportError('updater.install', e);
      setUpdateState('failed');
      showToast(t('update_failed'), 'error');
    }
  };

  const updateText =
    updateState === 'checking' ? t('checking_updates')
    : updateState === 'latest' ? t('up_to_date')
    : updateState === 'installing' ? t('update_installing')
    : updateState === 'failed' ? t('update_check_failed')
    : t('check_updates_desc');

  return (
    <>
      <div className={`sheet-scrim${settingsOpen ? ' on' : ''}`} onClick={() => setSettingsOpen(false)} aria-hidden />
      <aside className={`sheet${settingsOpen ? ' on' : ''}`} aria-label={t('topbar_settings')} aria-hidden={!settingsOpen} {...(settingsOpen ? {} : { inert: '' })}>
        <div className="sheet-head">
          <h2>{t('topbar_settings')}</h2>
          <button type="button" className="sheet-x" onClick={() => setSettingsOpen(false)} aria-label={t('close')}>
            <X size={16} />
          </button>
        </div>

        <section className="sheet-group">
          <h3>{t('settings_playback')}</h3>
          <div className="sheet-row">
            <div><b>{t('settings_hover_preview')}</b><span>{t('settings_hover_preview_desc')}</span></div>
            <HardwareSwitch checked={hoverPreview} onChange={setHoverPreview} label={t('settings_hover_preview')} />
          </div>
          <div className="sheet-row">
            <div><b>{t('settings_view')}</b><span>{t('settings_view_desc')}</span></div>
            <Segmented
              ariaLabel={t('settings_view')}
              value={soundView}
              onChange={setSoundView}
              options={[{ value: 'cards', label: t('view_cards') }, { value: 'list', label: t('view_list') }]}
            />
          </div>
        </section>

        <section className="sheet-group">
          <h3>{t('settings_app')}</h3>
          <div className="sheet-row">
            <div><b>{t('topbar_language')}</b></div>
            <Segmented
              ariaLabel={t('topbar_language')}
              value={language}
              onChange={(v) => { setLanguage(v); showToast(v === 'ro' ? 'Limba: română' : 'Language: English', 'success'); }}
              options={[{ value: 'ro', label: 'RO' }, { value: 'en', label: 'EN' }]}
            />
          </div>
          <div className="sheet-row">
            <div><b>{t('launch_startup')}</b><span>{t('launch_startup_desc')}</span></div>
            <HardwareSwitch checked={autostart} onChange={toggleAutostart} label={t('launch_startup')} />
          </div>
        </section>

        <section className="sheet-group">
          <h3>{t('check_updates')}</h3>
          <div className="sheet-row">
            <div className="sheet-grow">
              <b>{version ? t('settings_version', { version }) : 'Beats.ly'}</b>
              <span>{updateText}</span>
              {updateState === 'installing' && (
                <span className="sheet-bar"><i style={{ width: `${progress ?? 15}%` }} /></span>
              )}
            </div>
            <button
              type="button"
              className="sheet-btn"
              onClick={checkUpdates}
              disabled={updateState === 'checking' || updateState === 'installing'}
            >
              {t('btn_check')}
            </button>
          </div>
          <div className="sheet-row">
            <div><b>{t('help_support')}</b><span>{t('help_support_desc')}</span></div>
            <button
              type="button"
              className="sheet-btn"
              disabled={!FEATURES.helpCenter}
              onClick={() => open('https://beatsly.vercel.app/help').catch(() => {})}
            >
              {FEATURES.helpCenter ? t('btn_help') : t('coming_soon')}
            </button>
          </div>
        </section>

        {user && (
          <button
            type="button"
            className="sheet-logout"
            onClick={async () => { setSettingsOpen(false); await signOut(); navigate('/auth'); }}
          >
            <LogOut size={15} /> {t('topbar_logout')}
          </button>
        )}
      </aside>
    </>
  );
};
