import React, { useEffect, useState } from 'react';
import { Sample } from '../types';
import { Waveform } from './Waveform';
import { extractRealPeaks } from '../utils/audioAnalyzer';
import { startDrag } from '@crabnebula/tauri-plugin-drag';

interface SampleRowProps {
  sample: Sample;
  isPlaying: boolean;
  isActive: boolean; 
  progress: number;
  isAnalyzing: boolean; // <--- ADAUGĂ ASTA
  onTogglePlay: (id: string, url: string) => void;
  onAnalyze: (id: string, path: string) => void; 
}

export const SampleRow: React.FC<SampleRowProps> = ({ sample, isPlaying, isActive, progress, isAnalyzing, onTogglePlay, onAnalyze }) => {
  const [localPeaks, setLocalPeaks] = useState<number[]>(Array(40).fill(0.1));

  useEffect(() => {
    let isMounted = true; 
    const timerId = setTimeout(async () => {
      const calculatedPeaks = await extractRealPeaks(sample.url, 40);
      if (isMounted) setLocalPeaks(calculatedPeaks);
    }, 150);
    return () => { isMounted = false; clearTimeout(timerId); };
  }, [sample.url]);

  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.preventDefault(); 
        startDrag({ item: [sample.path], icon: 'icon.png' }); 
      }}
      className={`flex items-center justify-between p-3 border-b border-white/5 transition-all cursor-grab group
        ${isActive ? 'bg-blue-900/20 border-l-4 border-l-blue-500' : 'hover:bg-white/5 border-l-4 border-l-transparent'}
      `}
    >
      
      {/* Nume & Buton de Play */}
      <div className="w-3/12 flex items-center gap-4 pr-4">
        <button 
          onClick={() => onTogglePlay(sample.id, sample.url)}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
            isPlaying 
              ? 'bg-blue-500 text-white shadow-blue-500/40 scale-105' 
              : isActive 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700 group-hover:text-white'
          }`}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span className={`truncate font-medium transition-colors ${isActive ? 'text-blue-400' : 'text-gray-200'}`} title={sample.name}>
          {sample.name}
        </span>
      </div>

      {/* Waveform */}
      <div className="w-3/12 px-4 opacity-80 group-hover:opacity-100 transition-opacity">
        <Waveform peaks={localPeaks} progress={progress} isPlaying={isPlaying} />
      </div>

      {/* BPM & Key + BUTONUL MAGIC AI */}
      <div className="w-2/12 text-sm flex items-center gap-2">
        <span className="font-mono text-gray-300 bg-black/30 px-2 py-1 rounded-md">{sample.bpm} BPM</span> 
        <span className="text-gray-600">•</span> 
        <span className="font-semibold text-gray-400">{sample.key}</span>
        
        {/* Butonul Magic AI (Cu efect de Loading) */}
        {isAnalyzing ? (
          <div className="ml-2 flex items-center gap-1.5 px-2 py-1 bg-blue-900/40 text-blue-400 rounded border border-blue-500/20">
            <svg className="animate-spin h-3.5 w-3.5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-[10px] uppercase font-bold tracking-wider">Analiză</span>
          </div>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); onAnalyze(sample.id, sample.path); }}
            className="ml-2 text-xs bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white px-2 py-1 rounded transition-colors"
            title="Detectează BPM și Key cu AI"
          >
            🤖 AI
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="w-3/12 flex flex-wrap gap-1 pr-2">
        {sample.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-xs px-2 py-1 bg-black/40 border border-white/10 rounded-md text-gray-400">
            {tag}
          </span>
        ))}
      </div>

      {/* Durată */}
      <div className="w-1/12 text-right text-sm text-gray-500 font-mono group-hover:text-gray-300 transition-colors">
        {sample.duration}
      </div>
    </div>
  );
};