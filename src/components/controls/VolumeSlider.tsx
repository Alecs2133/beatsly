import React, { useRef } from 'react';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';
import './controls.css';

interface VolumeSliderProps {
  /** 0..1 */
  value: number;
  onChange: (value: number) => void;
  label: string;
  muteLabel: string;
}

/**
 * Volumul din dock: difuzorul pune pe mut / revine la nivelul de dinainte,
 * bara orizontală se trage sau se dă click oriunde pe ea; rotița și săgețile
 * merg din 5 în 5%.
 */
export const VolumeSlider: React.FC<VolumeSliderProps> = ({ value, onChange, label, muteLabel }) => {
  // Nivelul la care revii după „mut” — nu 0, nu 100%, ce aveai.
  const beforeMute = useRef(value > 0 ? value : 0.8);
  const pct = Math.round(value * 100);
  const VolIcon = value === 0 ? VolumeX : value < 0.34 ? Volume : value < 0.67 ? Volume1 : Volume2;

  const set = (v: number) => onChange(Math.min(1, Math.max(0, Math.round(v * 100) / 100)));

  const toggleMute = () => {
    if (value > 0) {
      beforeMute.current = value;
      set(0);
    } else {
      set(beforeMute.current || 0.8);
    }
  };

  return (
    <div className="vol" onWheel={(e) => set(value + (e.deltaY < 0 ? 0.05 : -0.05))}>
      <button type="button" className="vol-btn" onClick={toggleMute} title={muteLabel} aria-label={muteLabel} aria-pressed={value === 0}>
        <VolIcon size={16} />
      </button>
      <input
        type="range"
        className="vol-range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => {
          const v = Number(e.target.value) / 100;
          if (v > 0) beforeMute.current = v;
          set(v);
        }}
        aria-label={label}
        aria-valuetext={`${pct}%`}
        title={`${pct}%`}
        style={{ '--v': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
};
