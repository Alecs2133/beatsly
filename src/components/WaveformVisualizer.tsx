import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayerStore } from '../store/usePlayerStore';

export const WaveformVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const audio = usePlayerStore(state => state.audio);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // wait for audio to be available
    if (!containerRef.current || !audio) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(255, 255, 255, 0.2)',
      progressColor: '#00ffcc', // var(--accent-primary)
      cursorColor: '#ffffff',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 40,
      normalize: true,
      dragToSeek: true,
      media: audio, // Use the global audio element directly!
    });
    
    // Listen to decode events for the UI loader
    wavesurferRef.current.on('load', () => setIsLoading(true));
    wavesurferRef.current.on('ready', () => setIsLoading(false));

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audio]); // Re-run if audio changes (rarely happens)

  useEffect(() => {
    if (wavesurferRef.current && currentTrack) {
      const url = currentTrack.preview_url || currentTrack.file_url || '';
      // Load the new audio file to generate its specific waveform
      wavesurferRef.current.load(url);
    }
  }, [currentTrack]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '40px', cursor: currentTrack ? 'pointer' : 'default', margin: '0 15px' }}>
      {!currentTrack && (
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.1)', transform: 'translateY(-50%)' }} />
      )}
      
      {/* The container where WaveSurfer will draw the canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', opacity: currentTrack ? 1 : 0, transition: 'opacity 0.3s' }} />
      
      {isLoading && currentTrack && (
        <div style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          color: 'var(--accent-primary)', fontSize: '10px', 
          background: 'rgba(0,0,0,0.5)', zIndex: 10, borderRadius: '4px' 
        }}>
          GENERATING WAVEFORM...
        </div>
      )}
    </div>
  );
};
