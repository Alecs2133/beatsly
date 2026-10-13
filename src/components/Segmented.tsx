import { useLayoutEffect, useRef } from 'react';

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

/**
 * Selector de tip „segmente” — pastila de fundal alunecă elastic sub opțiunea
 * aleasă, în loc ca butonul activ să-și schimbe brusc culoarea.
 */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const pill = pillRef.current;
    if (!root || !pill) return;
    const active = root.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!active) return;
    pill.style.width = `${active.offsetWidth}px`;
    pill.style.transform = `translateX(${active.offsetLeft}px)`;
  }, [value, options]);

  return (
    <div ref={rootRef} className="segmented" role="group" aria-label={ariaLabel}>
      <span ref={pillRef} className="segmented-pill" aria-hidden />
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className="segmented-option"
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
