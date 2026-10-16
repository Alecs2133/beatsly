import React, { useMemo } from 'react';
import { ALL_KEYS, isHarmonicallyCompatible, toCamelot, type ParsedKey } from '../../lib/musicKey';
import './controls.css';

interface CamelotWheelProps {
  /** Indexul în ALL_KEYS al tonalității alese, sau null. */
  value: number | null;
  onChange: (index: number | null) => void;
  anyLabel: string;
  subLabel: string;
}

interface Segment {
  index: number;
  code: string;
  label: string;
  /** Ce scrie pe felie: „Cm”, „Ebmaj”. */
  name: string;
  key: ParsedKey;
  path: string;
  tx: number;
  ty: number;
}

const C = 120;

function annular(r1: number, r2: number, a1: number, a2: number): string {
  const p = (r: number, a: number) => `${C + r * Math.cos(a)} ${C + r * Math.sin(a)}`;
  return `M${p(r2, a1)} A${r2} ${r2} 0 0 1 ${p(r2, a2)} L${p(r1, a2)} A${r1} ${r1} 0 0 0 ${p(r1, a1)}Z`;
}

/**
 * Roata Camelot: inelul exterior = tonalități majore (B), interior = minore
 * (A). Pe felii scrie tonalitatea reală („Cm”, „Ebmaj”); codul Camelot apare
 * în centru când alegi una. Alegi una, iar cele compatibile armonic (aceeași regulă ca filtrul din
 * Descoperă, `isHarmonicallyCompatible`) se aprind automat.
 */
export const CamelotWheel: React.FC<CamelotWheelProps> = ({ value, onChange, anyLabel, subLabel }) => {
  const segments = useMemo<Segment[]>(
    () =>
      ALL_KEYS.map((k, index) => {
        const code = toCamelot(k.key);
        const n = parseInt(code, 10);
        const major = code.endsWith('B');
        const [r1, r2] = major ? [80, 114] : [46, 78];
        const a1 = (((n - 1) * 30 - 105) * Math.PI) / 180;
        const a2 = a1 + (30 * Math.PI) / 180;
        const mid = (a1 + a2) / 2;
        const rm = (r1 + r2) / 2;
        return { index, code, label: k.label, name: major ? `${k.label}maj` : k.label, key: k.key, path: annular(r1, r2, a1, a2), tx: C + rm * Math.cos(mid), ty: C + rm * Math.sin(mid) };
      }),
    []
  );

  const selected = value == null ? null : segments.find(s => s.index === value) ?? null;

  return (
    <svg className="camelot" viewBox="0 0 240 240" role="group" aria-label="Camelot">
      {segments.map(s => {
        const isSel = selected?.index === s.index;
        const compat = !!selected && !isSel && isHarmonicallyCompatible(selected.key, s.key);
        return (
          <g key={s.index}>
            <path
              className={`camelot-seg${isSel ? ' sel' : ''}${compat ? ' compat' : ''}`}
              d={s.path}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              aria-label={`${s.code} · ${s.label}`}
              onClick={() => onChange(isSel ? null : s.index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(isSel ? null : s.index); }
              }}
            >
              <title>{`${s.code} · ${s.label}`}</title>
            </path>
            <text className={`camelot-t${isSel || compat ? ' on' : ''}${s.key.mode === 'minor' ? ' minor' : ''}`} x={s.tx} y={s.ty}>{s.name}</text>
          </g>
        );
      })}
      <circle className="camelot-hub" cx={C} cy={C} r={42} />
      <text className="camelot-hub-t" x={C} y={selected ? 114 : 116}>{selected ? selected.name : anyLabel}</text>
      <text className="camelot-hub-s" x={C} y={selected ? 132 : 134}>{selected ? selected.code : subLabel}</text>
    </svg>
  );
};
