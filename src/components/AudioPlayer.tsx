import { usePlayer } from '../context/PlayerContext';
import { useAppStore } from '../store/useAppStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { WaveformVisualizer } from './WaveformVisualizer';
import './AudioPlayer.css';

export const AudioPlayer: React.FC = () => {
  const { currentTrack, isPlaying, currentTime, duration, volume, togglePlay, changeVolume } = usePlayer();
  const { showToast } = useAppStore();
  const { toggleSaveSound, isSaved } = useLibraryStore();
  const { session, deductCredit } = useAuthStore();
  const { t } = useTranslation();

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    
    if (!currentTrack.id.toString().startsWith('local-')) {
      if (!session) {
        showToast(t('logged_in_download'), 'error');
        return;
      }
      
      const success = await deductCredit();
      if (!success) {
        showToast(t('not_enough_credits'), 'error');
        return;
      }
    }

    try {
      showToast(t('preparing_download'), 'info');
      const filePath = await save({
        defaultPath: `${currentTrack.title.replace(/\s+/g, '_')}.wav`,
        filters: [{ name: 'Audio', extensions: ['wav'] }]
      });

      if (!filePath) {
        showToast(t('download_cancelled'), 'info');
        return;
      }

      const response = await tauriFetch(currentTrack.file_url || '/test_beat.wav');
      const buffer = await response.arrayBuffer();
      
      await writeFile(filePath, new Uint8Array(buffer));
      
      showToast(t('download_complete'), 'success');
    } catch (error) {
      console.error(error);
      showToast(t('download_failed'), 'error');
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
          {isPlaying ? '⏸' : '▶'}
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
          <span>🔊</span>
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
          {currentTrack && isSaved(currentTrack.id) ? '❤️' : '🤍'}
        </button>
        <button 
          className="download-btn" 
          onClick={handleDownload}
          disabled={!currentTrack}
          title={t('download_track')}
        >
          ⬇ {t('download')}
        </button>
      </div>
    </div>
  );
};
