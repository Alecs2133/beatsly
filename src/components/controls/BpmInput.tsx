import React, { useEffect, useState } from 'react';
import './controls.css';

interface BpmInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  label: string;
  placeholder: string;
}

/**
 * BPM-ul scris de mână, lângă potențiometru — pentru când știi exact tempo-ul
 * și nu vrei să-l nimerești trăgând. Se aplică la Enter sau când ieși din
 * câmp; gol = orice tempo. Săgețile sus/jos merg câte 1.
 */
export const BpmInput: React.FC<BpmInputProps> = ({ value, onChange, min, max, label, placeholder }) => {
  const [draft, setDraft] = useState(value == null ? '' : String(value));

  // Potențiometrul sau paleta pot schimba valoarea din afară.
  useEffect(() => {
    setDraft(value == null ? '' : String(value));
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    const n = Math.round(Number(trimmed.replace(',', '.')));
    if (!Number.isFinite(n)) {
      setDraft(value == null ? '' : String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    onChange(clamped);
  };

  return (
    <input
      className="bpm-input num"
      type="text"
      inputMode="numeric"
      maxLength={3}
      value={draft}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          setDraft(value == null ? '' : String(value));
          e.currentTarget.blur();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const base = value ?? 120;
          onChange(Math.min(max, Math.max(min, base + (e.key === 'ArrowUp' ? 1 : -1))));
        }
      }}
    />
  );
};
