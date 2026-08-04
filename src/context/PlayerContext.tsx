import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { SoundItem } from '../data/mockData';

interface PlayerContextType {
  currentTrack: SoundItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: SoundItem) => void;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  changeVolume: (level: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<SoundItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playTrack = (track: SoundItem) => {
    if (currentTrack?.id === track.id) {
      // Daca dam play la aceeasi melodie, ii dam toggle play/pause
      togglePlay();
    } else {
      // Daca e melodie noua, o setam si o pornim
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changeVolume = (level: number) => {
    if (audioRef.current) {
      audioRef.current.volume = level;
      setVolume(level);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Error playing audio", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, []);

  return (
    <PlayerContext.Provider value={{ 
      currentTrack, isPlaying, currentTime, duration, volume, 
      playTrack, togglePlay, seekTo, changeVolume, audioRef 
    }}>
      {children}
      {/* Audio element ascuns global. Daca piesa are file_url, il folosim. Daca nu, mock. */}
      <audio 
        ref={audioRef} 
        src={currentTrack?.file_url || '/test_beat.wav'} 
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      />
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
