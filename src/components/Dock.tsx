import React, { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, ShieldCheck, ShoppingBag, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, SlidersHorizontal } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAppStore } from '../store/useAppStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { requestDownloadUrl, InsufficientCreditsError } from '../lib/soundUpload';
import { isAdminRole, isPublisherRole } from '../lib/roles';
import { WaveformVisualizer } from './WaveformVisualizer';
import { Icon } from './Icon';
import { VolumeSlider } from './controls/VolumeSlider';
import type { TranslationKeys } from '../i18n/en';
import './Dock.css';

interface NavItem {
  to: string;
  label: TranslationKeys;
  icon: React.ReactNode;
  badge?: number;
}

const formatTime = (time: number) => {
  if (!Number.isFinite(time)) return '0:00';
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

/**
 * Dock-ul plutitor de jos: navigarea și playerul într-un singur loc, ca să
 * rămână toată lățimea pentru sunete. Iconițele se măresc sub cursor, iar
 * punctul de sub ele alunecă la pagina activă.
 */
export const Dock: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, session } = useAuthStore();
  const savedSounds = useLibraryStore(s => s.savedSounds);
  const toggleSaveSound = useLibraryStore(s => s.toggleSaveSound);
  const isSaved = useLibraryStore(s => s.isSaved);
  const { showToast, setSettingsOpen, settingsOpen } = useAppStore();

  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const volume = usePlayerStore(s => s.volume);
  const queue = usePlayerStore(s => s.queue);
  const shuffle = usePlayerStore(s => s.shuffle);
  const repeat = usePlayerStore(s => s.repeat);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const next = usePlayerStore(s => s.next);
  const prev = usePlayerStore(s => s.prev);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const cycleRepeat = usePlayerStore(s => s.cycleRepeat);
  const changeVolume = usePlayerStore(s => s.changeVolume);

  const [dlState, setDlState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [saveTick, setSaveTick] = useState(0);
  const itemsRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);

  const role = profile?.role;
  const items: NavItem[] = [
    { to: '/', label: 'nav_discover', icon: <Compass size={21} strokeWidth={1.8} /> },
    { to: '/library', label: 'nav_my_sounds', icon: <Icon name="heart" size={21} />, badge: savedSounds.length || undefined },
    { to: '/analyzer', label: 'nav_ai_generator', icon: <Icon name="sparkle" size={21} /> },
    ...(isPublisherRole(role) ? [{ to: '/upload', label: 'nav_upload' as const, icon: <Icon name="upload" size={21} /> }] : []),
    { to: '/store', label: 'nav_store', icon: <ShoppingBag size={21} strokeWidth={1.8} /> },
    ...(isAdminRole(role) ? [{ to: '/admin', label: 'nav_admin' as const, icon: <ShieldCheck size={21} strokeWidth={1.8} /> }] : []),
  ];
  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));
  const activeKey = settingsOpen ? 'settings' : items.find(i => isActive(i.to))?.to ?? '';

  useLayoutEffect(() => {
    const host = itemsRef.current;
    const ind = indRef.current;
    if (!host || !ind) return;
    const el = host.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`);
    ind.style.opacity = el ? '1' : '0';
    if (el) ind.style.transform = `translateX(${el.offsetLeft + el.offsetWidth / 2 - 2.5}px)`;
  }, [activeKey, items.length]);

  // Mărire sub cursor, ca la dock-ul macOS
  const onPointerMove = (e: React.PointerEvent) => {
    itemsRef.current?.querySelectorAll<HTMLElement>('.dock-item').forEach(el => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      el.style.setProperty('--s', (1 + 0.3 * Math.max(0, 1 - d / 90)).toFixed(3));
    });
  };
  const onPointerLeave = () => {
    itemsRef.current?.querySelectorAll<HTMLElement>('.dock-item').forEach(el => el.style.setProperty('--s', '1'));
  };

  const saved = !!currentTrack && isSaved(currentTrack.id);

  const handleDownload = async () => {
    if (!currentTrack || dlState === 'busy') return;
    const isLocal = currentTrack.id.toString().startsWith('local-');
    if (!isLocal && !session) {
      showToast(t('logged_in_download'), 'error');
      return;
    }
    try {
      const filePath = await save({
        defaultPath: `${currentTrack.title.replace(/\s+/g, '_')}.wav`,
        filters: [{ name: 'Audio', extensions: ['wav'] }],
      });
      if (!filePath) {
        showToast(t('download_cancelled'), 'info');
        return;
      }
      setDlState('busy');
      // URL semnat de la server; creditul se consumă acolo, în aceeași cerere.
      const sourceUrl = isLocal ? currentTrack.file_url ?? '' : await requestDownloadUrl(currentTrack.id.toString());
      const response = await tauriFetch(sourceUrl);
      await writeFile(filePath, new Uint8Array(await response.arrayBuffer()));
      setDlState('done');
      setTimeout(() => setDlState('idle'), 1600);
      showToast(t('download_complete'), 'success');
    } catch (error) {
      setDlState('idle');
      console.error('[download]', error);
      if (error instanceof InsufficientCreditsError) showToast(t('not_enough_credits'), 'error');
      else showToast(`${t('download_failed')}: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  return (
    <nav className={`dock${isPlaying ? ' playing' : ''}`} aria-label="Beats.ly">
      <div className="dock-items" ref={itemsRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
        <span className="dock-ind" ref={indRef} aria-hidden />
        {items.map(item => (
          <button
            key={item.to}
            type="button"
            data-key={item.to}
            className={`dock-item bi-trigger${activeKey === item.to ? ' active' : ''}`}
            onClick={() => { setSettingsOpen(false); navigate(item.to); }}
            aria-label={t(item.label)}
          >
            {item.icon}
            {item.badge ? <span className="dock-badge" key={item.badge}>{item.badge}</span> : null}
            <span className="dock-tip">{t(item.label)}</span>
          </button>
        ))}
        <button
          type="button"
          data-key="settings"
          className={`dock-item${activeKey === 'settings' ? ' active' : ''}`}
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-label={t('topbar_settings')}
        >
          <SlidersHorizontal size={21} strokeWidth={1.8} />
          <span className="dock-tip">{t('topbar_settings')}</span>
        </button>
      </div>

      <span className="dock-sep" aria-hidden />

      <div className={`transport${currentTrack ? '' : ' empty'}`}>
        <div className="tp-buttons">
          <button type="button" className="tp-small" onClick={prev} disabled={!currentTrack} aria-label={t('player_previous')}>
            <SkipBack size={15} fill="currentColor" />
          </button>
          <button type="button" className="tp-play" onClick={togglePlay} disabled={!currentTrack} aria-label={isPlaying ? 'Pause' : 'Play'}>
            <svg className="tp-glyph pl" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
            <svg className="tp-glyph pa" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          </button>
          <button type="button" className="tp-small" onClick={next} disabled={queue.length < 2} aria-label={t('player_next')}>
            <SkipForward size={15} fill="currentColor" />
          </button>
        </div>

        <div className="tp-info">
          <div className="tp-meta">
            <b>{currentTrack ? currentTrack.title : t('player_select_sound')}</b>
            <span className="num">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <WaveformVisualizer height={24} />
        </div>

        <div className="tp-actions">
          <button
            type="button"
            className={`tp-small${shuffle ? ' on' : ''}`}
            onClick={toggleShuffle}
            disabled={queue.length < 2}
            title={t('player_shuffle')}
            aria-pressed={shuffle}
          >
            <Shuffle size={14} />
          </button>
          <button
            type="button"
            className={`tp-small${repeat !== 'off' ? ' on' : ''}`}
            onClick={cycleRepeat}
            disabled={!currentTrack}
            title={t(repeat === 'one' ? 'player_repeat_one' : repeat === 'all' ? 'player_repeat_all' : 'player_repeat_off')}
          >
            {repeat === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
          </button>
          <button
            type="button"
            className={`tp-icon bi-trigger${saved ? ' saved' : ''}`}
            onClick={() => {
              if (!currentTrack) return;
              if (!saved) setSaveTick(n => n + 1);
              toggleSaveSound(currentTrack);
            }}
            disabled={!currentTrack}
            title={t('save_to_my_sounds')}
            aria-pressed={saved}
          >
            <Icon name="heart" size={19} filled={saved} play={saveTick} />
          </button>
          <button
            type="button"
            className={`tp-icon bi-trigger dl ${dlState}`}
            onClick={handleDownload}
            disabled={!currentTrack || dlState === 'busy'}
            title={t('download_track')}
          >
            {dlState === 'busy' ? <span className="tp-ring" aria-hidden /> : dlState === 'done' ? <Icon name="check" size={18} play={1} /> : <Icon name="download" size={19} />}
          </button>
          <VolumeSlider value={volume} onChange={changeVolume} label={t('player_volume')} muteLabel={t('player_mute')} />
        </div>
      </div>
    </nav>
  );
};
