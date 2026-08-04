import React from 'react';

interface WaveformProps {
  peaks: number[];
  isPlaying: boolean;
  progress: number; // Procentajul din melodie (0 - 100)
}

export const Waveform: React.FC<WaveformProps> = ({ peaks, isPlaying, progress }) => {
  return (
    <div className="flex items-center gap-[2px] h-8 w-full max-w-[120px]">
      {peaks.map((peak, index) => {
        // Calculăm la ce procentaj din lățimea totală se află această bară
        const barPosition = (index / peaks.length) * 100;
        
        // Bara este "activă" dacă e în urma playhead-ului
        const isActive = isPlaying && progress >= barPosition;

        return (
          <div
            key={index}
            style={{ height: `${peak * 100}%` }}
            className={`flex-1 rounded-sm transition-all duration-75 ${
              isActive 
                ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]' // Glow efect pentru partea redată
                : isPlaying 
                  ? 'bg-blue-900/50' // Restul waveform-ului când e pe play
                  : 'bg-gray-600'    // Starea normală (oprit)
            }`}
          />
        );
      })}
    </div>
  );
};