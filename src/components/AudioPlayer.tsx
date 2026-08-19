import { usePlayerStore } from '../store/usePlayerStore';
import { useAppStore } from '../store/useAppStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { requestDownloadUrl, InsufficientCreditsError } from '../lib/soundUpload';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { WaveformVisualizer } from './WaveformVisualizer';
import { Play, Pause, Volume2, Heart, Download } from 'lucide-react';
import './AudioPlayer.css';

export const AudioPlayer: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const currentTime = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);
  const volume = usePlayerStore(state => state.volume);
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const changeVolume = usePlayerStore(state => state.changeVolume);
  const { showToast } = useAppStore();
  const { toggleSaveSound, isSaved } = useLibraryStore();
  const { session } = useAuthStore();
  const { t } = useTranslation();

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    
    const isLocal = currentTrack.id.toString().startsWith('local-');

    if (!isLocal && !session) {
      showToast(t('logged_in_download'), 'error');
      return;
    }

    try {
      const filePath = await save({
        defaultPath: `${currentTrack.title.replace(/\s+/g, '_')}.wav`,
        filters: [{ name: 'Audio', extensions: ['wav'] }]
      });

      if (!filePath) {
        showToast(t('download_cancelled'), 'info');
        return;
      }

      showToast(t('preparing_download'), 'info');

      // URL semnat de la server; creditul se consumă acolo, în aceeași cerere.
      const sourceUrl = isLocal
        ? (currentTrack.file_url ?? '')
        : await requestDownloadUrl(currentTrack.id.toString());

      const response = await tauriFetch(sourceUrl);
      const buffer = await response.arrayBuffer();

      await writeFile(filePath, new Uint8Array(buffer));

      showToast(t('download_complete'), 'success');
    } catch (error) {
      console.error('[download]', error);
      if (error instanceof InsufficientCreditsError) {
        showToast(t('not_enough_credits'), 'error');
      } else {
        // Mesajul brut, nu doar eticheta generică: fără el orice esec arata
        // la fel, iar cauza reala ramane doar in consola.
        const detail = error instanceof Error ? error.message : String(error);
        showToast(`${t('download_failed')}: ${detail}`, 'error');
      }
    }
  };

  return (
    <div className="audio-player glass">
      <div className="track-info">
        <div className={`track-artwork ${isPlaying ? 'playing' : ''}`} style={{ background: currentTrack ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)' }}></div>
        <div className="track-details">
          <p className="track-title">{currentTrack ? currentTrack.title : 'Select a sound'}</p>
          <p className="track-author">{currentTrack ? currentTrack.author : '-'}</p>
        </div>
      </div>
      
      <div className="player-controls">
        <button 
           className="play-btn" 
           onClick={togglePlay}
           disabled={!currentTrack}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
      </div>
      
      <div className="player-waveform">
        <span className="time-display">{formatTime(currentTime)}</span>
        <div className="progress-container" style={{ display: 'flex', flex: 1, alignItems: 'center', position: 'relative' }}>
          <WaveformVisualizer />
        </div>
        <span className="time-display">{formatTime(duration)}</span>
      </div>
      
      <div className="player-actions">
        <div className="volume-control">
          <Volume2 size={18} color="var(--text-muted)" />
          <input 
            type="range" 
            className="volume-bar" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            style={{ '--progress': `${volume * 100}%` } as React.CSSProperties}
          />
        </div>
        <button 
          className={`action-btn ${currentTrack && isSaved(currentTrack.id) ? 'active' : ''}`}
          onClick={() => currentTrack && toggleSaveSound(currentTrack)}
          disabled={!currentTrack}
          title={t('save_to_my_sounds')}
        >
          <Heart size={20} color={currentTrack && isSaved(currentTrack.id) ? "var(--accent-tertiary)" : "var(--text-main)"} fill={currentTrack && isSaved(currentTrack.id) ? "var(--accent-tertiary)" : "none"} />
        </button>
        <button 
          className="download-btn" 
          onClick={handleDownload}
          disabled={!currentTrack}
          title={t('download_track')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={16} /> {t('download')}
        </button>
      </div>
    </div>
  );
};
