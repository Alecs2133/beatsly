import React, { useRef } from 'react';
import './controls.css';

interface KnobProps {
  min: number;
  max: number;
  /** `null` = oprit (de ex. „orice BPM”). */
  value: number | null;
  onChange: (value: number | null) => void;
  size?: number;
  label: string;
}

/**
 * Potențiometru ca pe un mixer: tragi în sus/jos, rotița mouse-ului sau
 * săgețile de la tastatură. Dacă e oprit (`null`), primul gest îl pornește
 * de la mijlocul intervalului.
 */
export const Knob: React.FC<KnobProps> = ({ min, max, value, onChange, size = 72, label }) => {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const c = size / 2;
  // Totul proporțional cu mărimea — cu valori fixe, la 34px capacul ieșea
  // de 2px și acul arăta în direcția greșită.
  const stroke = Math.max(3, size * 0.055);
  const r = c - stroke - 2;
  const len = 2 * Math.PI * r * 0.75;
  const f = value == null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const mid = (min + max) / 2;

  const set = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v))));

  return (
    <div
      className={`knob${value == null ? ' off' : ''}`}
      style={{ width: size, height: size }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value ?? undefined}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { y: e.clientY, v: value ?? mid };
        if (value == null) set(mid);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        set(drag.current.v + ((drag.current.y - e.clientY) * (max - min)) / 160);
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onWheel={(e) => set((value ?? mid) + (e.deltaY < 0 ? 1 : -1))}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); set((value ?? min) + 1); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); set((value ?? min) - 1); }
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="knob-track" cx={c} cy={c} r={r} strokeWidth={stroke} strokeDasharray={`${len} 999`} transform={`rotate(135 ${c} ${c})`} />
        <circle
          className="knob-arc"
          cx={c}
          cy={c}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={`${len} 999`}
          strokeDashoffset={len * (1 - f)}
          transform={`rotate(135 ${c} ${c})`}
        />
        <circle className="knob-cap" cx={c} cy={c} r={r * 0.7} />
        <line
          className="knob-ptr"
          x1={c}
          y1={c - r * 0.58}
          x2={c}
          y2={c - r * 0.3}
          strokeWidth={Math.max(2, size * 0.04)}
          style={{ transformOrigin: `${c}px ${c}px`, transform: `rotate(${-135 + f * 270}deg)` }}
        />
      </svg>
    </div>
  );
};
