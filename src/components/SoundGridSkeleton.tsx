import React from 'react';

/** Rânduri gri care strălucesc cât se încarcă lista — aceeași formă ca SoundGrid, deci pagina nu sare. */
export const SoundGridSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div className="sound-grid" aria-busy="true">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="grid-row skeleton-row" style={{ '--i': i } as React.CSSProperties}>
        <div className="col col-play"><span className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} /></div>
        <div className="col col-title" style={{ gap: 6 }}>
          <span className="skeleton" style={{ width: `${55 + ((i * 17) % 35)}%`, height: 12 }} />
          <span className="skeleton" style={{ width: '30%', height: 10 }} />
        </div>
        <div className="col col-bpm"><span className="skeleton" style={{ width: 28, height: 12 }} /></div>
        <div className="col col-key"><span className="skeleton" style={{ width: 40, height: 18 }} /></div>
        <div className="col col-tags"><span className="skeleton" style={{ width: 52, height: 18, borderRadius: 999 }} /><span className="skeleton" style={{ width: 44, height: 18, borderRadius: 999 }} /></div>
        <div className="col col-actions"><span className="skeleton" style={{ width: 90, height: 18 }} /></div>
      </div>
    ))}
  </div>
);
