import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pitchName, type GridNote } from '../../lib/midi/notes';
import './PianoRoll.css';

interface PianoRollProps {
  notes: GridNote[];
  lengthBeats: number;
  /** Linia de redare, în pătrimi. */
  playhead: number | null;
}

const ROW = 14;
const BEAT = 56;
const KEYS = 52;
const BLACK = new Set([1, 3, 6, 8, 10]);

/**
 * Piano roll-ul cu notele detectate: măsuri și timpi pe orizontală, clapele
 * pe verticală — cum o să le vezi și în DAW după ce tragi fișierul.
 *
 * Grila și notele se desenează o singură dată; la redare se schimbă doar
 * linia de redare și notele care sună (la un fișier de 3 minute grila are
 * peste o mie de linii — redesenată de 60 de ori pe secundă, sacada).
 */
export const PianoRoll: React.FC<PianoRollProps> = ({ notes, lengthBeats: contentBeats, playhead }) => {
  // Grila umple toată lățimea, în măsuri întregi — nu se oprește la ultima notă.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitBeats, setFitBeats] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setFitBeats(Math.ceil(entry.contentRect.width / BEAT / 4) * 4));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const lengthBeats = Math.max(contentBeats, fitBeats);

  const { low, high } = useMemo(() => {
    if (!notes.length) return { low: 55, high: 72 };
    let lo = 127, hi = 0;
    for (const n of notes) { lo = Math.min(lo, n.pitch); hi = Math.max(hi, n.pitch); }
    // Măcar o octavă vizibilă, plus puțin aer sus și jos.
    lo -= 2; hi += 2;
    if (hi - lo < 14) { const pad = Math.ceil((14 - (hi - lo)) / 2); lo -= pad; hi += pad; }
    return { low: Math.max(0, lo), high: Math.min(127, hi) };
  }, [notes]);

  const rows = high - low + 1;
  const width = Math.max(4, lengthBeats) * BEAT;
  const height = rows * ROW;
  const y = (pitch: number) => (high - pitch) * ROW;

  const keys = useMemo(
    () =>
      Array.from({ length: rows }, (_, i) => {
        const pitch = high - i;
        const black = BLACK.has(pitch % 12);
        return (
          <g key={pitch}>
            <rect x={0} y={i * ROW} width={black ? KEYS * 0.62 : KEYS} height={ROW} className={black ? 'k-black' : 'k-white'} />
            {pitch % 12 === 0 && <text x={KEYS - 5} y={i * ROW + ROW - 3.5} className="k-label">{pitchName(pitch)}</text>}
          </g>
        );
      }),
    [rows, high]
  );

  const grid = useMemo(
    () => (
      <>
        {Array.from({ length: rows }, (_, i) => (
          <rect key={`r${i}`} x={0} y={i * ROW} width={width} height={ROW} className={BLACK.has((high - i) % 12) ? 'row-black' : 'row-white'} />
        ))}
        {Array.from({ length: Math.ceil(lengthBeats * 4) + 1 }, (_, i) => (
          <line
            key={`l${i}`}
            x1={(i / 4) * BEAT}
            x2={(i / 4) * BEAT}
            y1={0}
            y2={height}
            className={i % 16 === 0 ? 'l-bar' : i % 4 === 0 ? 'l-beat' : 'l-sixteenth'}
          />
        ))}
        {Array.from({ length: Math.ceil(lengthBeats / 4) }, (_, bar) => (
          <text key={`b${bar}`} x={bar * 4 * BEAT + 4} y={11} className="bar-num">{bar + 1}</text>
        ))}
      </>
    ),
    [rows, high, width, height, lengthBeats]
  );

  const noteRects = useMemo(
    () =>
      notes.map((n, i) => (
        <rect
          key={i}
          className="note"
          x={n.startBeat * BEAT + 0.5}
          y={(high - n.pitch) * ROW + 1}
          width={Math.max(3, n.durationBeats * BEAT - 1)}
          height={ROW - 2}
          rx={3}
          style={{ opacity: 0.45 + (n.velocity / 127) * 0.55, animationDelay: `${Math.min(i, 60) * 12}ms` }}
        >
          <title>{`${pitchName(n.pitch)} · vel ${n.velocity}`}</title>
        </rect>
      )),
    [notes, high]
  );

  // Notele care sună acum — de obicei câteva, desenate peste celelalte.
  const sounding = playhead == null ? [] : notes.filter(n => playhead >= n.startBeat && playhead < n.startBeat + n.durationBeats);

  return (
    <div className="proll" style={{ '--rows': rows } as React.CSSProperties}>
      <svg className="proll-keys" width={KEYS} height={height} aria-hidden>
        {keys}
      </svg>
      <div className="proll-scroll" ref={scrollRef}>
        <svg width={width} height={height} className="proll-grid" role="img" aria-label={`${notes.length} MIDI`}>
          {grid}
          {noteRects}
          {sounding.map((n, i) => (
            <rect
              key={`on${i}`}
              className="note-on"
              x={n.startBeat * BEAT + 0.5}
              y={y(n.pitch) + 1}
              width={Math.max(3, n.durationBeats * BEAT - 1)}
              height={ROW - 2}
              rx={3}
            />
          ))}
          {playhead != null && <line className="playhead" x1={playhead * BEAT} x2={playhead * BEAT} y1={0} y2={height} />}
        </svg>
      </div>
    </div>
  );
};
