import React, { useRef } from 'react';
import { useWavePeaks } from '../hooks/useWavePeaks';
import { usePlayerStore } from '../store/usePlayerStore';

interface WaveBarsProps {
  url?: string;
  /** Sunetul cardului e cel încărcat în player → se umple cu progresul. */
  active: boolean;
  bars?: number;
}

/**
 * Forma de undă a unui card: două straturi identice de bare; cel colorat e
 * decupat după progresul redării, deci culoarea „curge” continuu.
 */
export const WaveBars: React.FC<WaveBarsProps> = ({ url, active, bars = 40 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const peaks = useWavePeaks(url, ref, bars);
  // Selectorul întoarce 0 pentru cardurile inactive, deci doar cardul care
  // cântă se re-randează la fiecare actualizare a timpului.
  const progress = usePlayerStore(s =>
    active && s.duration > 0 ? Math.min(1, s.currentTime / s.duration) : 0
  );

  if (!peaks) {
    return <div ref={ref} className="wave-bars loading" aria-hidden><span className="skeleton" /></div>;
  }

  const layer = peaks.map((p, i) => (
    <i key={i} style={{ height: `${Math.max(10, Math.round(p * 100))}%`, '--d': ((i * 37) % 50) / 100 } as React.CSSProperties} />
  ));

  return (
    <div ref={ref} className="wave-bars" style={{ '--p': progress } as React.CSSProperties} aria-hidden>
      <div className="wave-layer">{layer}</div>
      <div className="wave-layer fill">{layer}</div>
    </div>
  );
};
