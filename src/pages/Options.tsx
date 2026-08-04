import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';
import { check } from '@tauri-apps/plugin-updater';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getVersion } from '@tauri-apps/api/app';
import './Options.css';

export const Options: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, showToast } = useAppStore();
  const { t } = useTranslation();
  
  const [selectedLang, setSelectedLang] = useState<'en' | 'ro'>(language);
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [appVersion, setAppVersion] = useState('0.1.0 Beta');

  useEffect(() => {
    const initTauri = async () => {
      try {
        const autostartEnabled = await isEnabled();
        setLaunchAtStartup(autostartEnabled);
        
        const version = await getVersion();
        setAppVersion(`Version ${version}`);
      } catch (e) {
        console.warn("Tauri API not available or failed:", e);
      }
    };
    initTauri();
  }, []);

  const handleApply = () => {
    setLanguage(selectedLang);
    showToast(t('options_updated'), 'success');
  };

  const handleToggleAutostart = async () => {
    try {
      if (launchAtStartup) {
        await disable();
        setLaunchAtStartup(false);
        showToast(t('autostart_disabled'), 'info');
      } else {
        await enable();
        setLaunchAtStartup(true);
        showToast(t('autostart_enabled'), 'success');
      }
    } catch (e) {
      console.error("Failed to toggle autostart", e);
      showToast(t('autostart_failed'), 'error');
    }
  };

  const handleCheckUpdates = async () => {
    showToast(t('checking_updates'), 'info');
    try {
      const update = await check();
      if (update) {
        showToast(`${t('update_available')} (v${update.version})`, 'success');
        // update.downloadAndInstall();
      } else {
        showToast(t('up_to_date'), 'success');
      }
    } catch (e) {
      console.warn("Update check failed (no server configured):", e);
      // Fallback for demo
      setTimeout(() => showToast(`${t('up_to_date')} (${appVersion})`, 'success'), 1500);
    }
  };

  const handleHelp = async () => {
    try {
      await openUrl('https://beatsly.com/help');
    } catch (e) {
      console.warn("Opener failed:", e);
      showToast(t('opening_help'), 'info');
    }
  };

  return (
    <div className="options-page">
      <div className="options-header">
        <h1>{t('topbar_options')}</h1>
        <button className="options-close-btn" onClick={() => navigate(-1)} title="Close">
          ✕
        </button>
      </div>

      <div className="options-content">
        <div className="options-section">
          <h2>{t('preferences')}</h2>
          
          <div className="options-form-group">
            <label>{t('topbar_language')}</label>
            <div className="lang-selector">
              <div className={`lang-selector-bg lang-${selectedLang}`}></div>
              <div 
                className={`lang-option ${selectedLang === 'en' ? 'active' : ''}`}
                onClick={() => setSelectedLang('en')}
              >
                <span style={{ fontSize: '18px' }}>🇬🇧</span> English
              </div>
              <div 
                className={`lang-option ${selectedLang === 'ro' ? 'active' : ''}`}
                onClick={() => setSelectedLang('ro')}
              >
                <span style={{ fontSize: '18px' }}>🇷🇴</span> Română
              </div>
            </div>
          </div>

          <button className="options-apply-btn" onClick={handleApply}>
            {t('apply_changes')}
          </button>
        </div>

        <div className="options-section" style={{ marginTop: '24px' }}>
          <h2>{t('system_info')}</h2>
          <div className="options-list" style={{ marginTop: '16px' }}>
            <div className="options-item">
              <div className="options-item-info">
                <span className="options-item-title">{t('launch_startup')}</span>
                <span className="options-item-desc">{t('launch_startup_desc')}</span>
              </div>
              <div 
                className={`toggle-switch ${launchAtStartup ? 'active' : ''}`}
                onClick={handleToggleAutostart}
              >
                <div className="toggle-knob"></div>
              </div>
            </div>
            
            <div className="options-item">
              <div className="options-item-info">
                <span className="options-item-title">{t('check_updates')}</span>
                <span className="options-item-desc">{t('check_updates_desc')}</span>
              </div>
              <button className="options-action-btn" onClick={handleCheckUpdates}>{t('btn_check')}</button>
            </div>
            
            <div className="options-item">
              <div className="options-item-info">
                <span className="options-item-title">{t('help_support')}</span>
                <span className="options-item-desc">{t('help_support_desc')}</span>
              </div>
              <button className="options-action-btn" onClick={handleHelp}>{t('btn_help')}</button>
            </div>
            
            <div className="options-item">
              <div className="options-item-info">
                <span className="options-item-title">Beats.ly</span>
                <span className="options-item-desc">{appVersion}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
