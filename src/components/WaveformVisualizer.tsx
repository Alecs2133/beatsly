import React, { useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useWavePeaks } from '../hooks/useWavePeaks';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Forma de undă din player: aceleași vârfuri ca pe carduri, progresul din
 * store, click/drag/săgeți pentru derulare.
 *
 * Nu mai folosim wavesurfer legat de <audio>-ul global: după ce descărca
 * fișierul ca să-l decodeze, îi schimba `src`-ul într-un blob URL și
 * întrerupea redarea abia pornită (AbortError în consolă, iar playerul
 * rămânea „pe play” cu sunetul oprit).
 */
export const WaveformVisualizer: React.FC<{ height?: number; bars?: number }> = ({ height = 36, bars = 72 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const track = usePlayerStore(s => s.currentTrack);
  const duration = usePlayerStore(s => s.duration);
  const currentTime = usePlayerStore(s => s.currentTime);
  const seekTo = usePlayerStore(s => s.seekTo);
  const url = track ? track.preview_url || track.file_url : undefined;
  const peaks = useWavePeaks(url, ref, bars);
  const progress = duration > 0 ? clamp01(currentTime / duration) : 0;

  const seekAt = (clientX: number) => {
    const el = ref.current;
    if (!el || duration <= 0) return;
    const r = el.getBoundingClientRect();
    seekTo(clamp01((clientX - r.left) / r.width) * duration);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!track) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekAt(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seekAt(e.clientX);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (duration <= 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      seekTo(Math.min(duration, Math.max(0, currentTime + (e.key === 'ArrowRight' ? 5 : -5))));
    }
  };

  const layer = peaks?.map((p, i) => (
    <i key={i} style={{ height: `${Math.max(12, Math.round(p * 100))}%` }} />
  ));

  return (
    <div
      ref={ref}
      className={`dock-wave${track ? '' : ' empty'}`}
      style={{ height, '--p': progress } as React.CSSProperties}
      role="slider"
      tabIndex={track ? 0 : -1}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
    >
      {!track ? (
        <span className="dock-wave-line" />
      ) : !peaks ? (
        <span className="skeleton dock-wave-skeleton" />
      ) : (
        <>
          <div className="dock-wave-layer">{layer}</div>
          <div className="dock-wave-layer fill">{layer}</div>
        </>
      )}
    </div>
  );
};
