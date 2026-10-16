import React, { useEffect, useRef } from 'react';
import './Icon.css';

/**
 * Setul de iconițe Beats.ly — înlocuiește emoji-urile din interfață.
 * Aceeași grosime de linie peste tot; fiecare are o mică animație care spune
 * ce face acțiunea.
 *
 * Animația pornește:
 * - la hover pe un părinte cu clasa `bi-trigger` (ex. butonul care o conține);
 * - când `play` își schimbă valoarea (un contor incrementat la acțiune);
 * - continuu, când `play === true` (ex. loader-ul cât timp lucrează ceva).
 *
 * O copie identică stă în website/src/components/Icon.tsx.
 */

export type IconName =
  | 'logo'
  | 'trend'
  | 'sparkle'
  | 'signal'
  | 'folder'
  | 'upload'
  | 'check'
  | 'heart'
  | 'bell'
  | 'download'
  | 'alert'
  | 'info'
  | 'lock'
  | 'headphones';

interface IconProps {
  name: IconName;
  size?: number;
  /** Contor (re)pornit la fiecare schimbare, sau `true` pentru animație continuă. */
  play?: number | boolean;
  /** Pentru inimă: umplută (salvat). */
  filled?: boolean;
  className?: string;
  title?: string;
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const HEART_PATH =
  'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z';

function Shape({ name }: { name: IconName }) {
  switch (name) {
    case 'logo':
      return (
        <>
          <rect x="1" y="1" width="22" height="22" rx="6.5" fill="currentColor" />
          <g fill="var(--bi-logo-bars, #fff)">
            <rect className="bi-bar" x="5" y="10" width="2.2" height="4" rx="1.1" />
            <rect className="bi-bar" x="9" y="6.5" width="2.2" height="11" rx="1.1" />
            <rect className="bi-bar" x="13" y="8.5" width="2.2" height="7" rx="1.1" />
            <rect className="bi-bar" x="17" y="5" width="2.2" height="14" rx="1.1" />
          </g>
        </>
      );
    case 'trend':
      return (
        <g {...STROKE} strokeWidth={1.9}>
          <path className="bi-line" d="M3 17 9 11l4 4 7-8" />
          <circle className="bi-dot" cx="20" cy="7" r="1.6" fill="currentColor" stroke="none" />
        </g>
      );
    case 'sparkle':
      return (
        <g {...STROKE}>
          <path className="bi-big" d="M10 3.5 11.8 9.2 17.5 11 11.8 12.8 10 18.5 8.2 12.8 2.5 11 8.2 9.2z" />
          <path className="bi-small" d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" />
        </g>
      );
    case 'signal':
      return (
        <g fill="currentColor">
          <rect className="bi-bar" x="3.5" y="7" width="2.6" height="10" rx="1.3" />
          <rect className="bi-bar" x="8.5" y="4.5" width="2.6" height="15" rx="1.3" />
          <rect className="bi-bar" x="13.5" y="7" width="2.6" height="10" rx="1.3" />
          <rect className="bi-bar" x="18.5" y="9" width="2.6" height="6" rx="1.3" />
        </g>
      );
    case 'folder':
      return (
        <g {...STROKE}>
          <path d="M3 6.5h6l2 2h10V19H3z" />
          <path className="bi-flap" d="M3 19 5.5 11H22l-2.5 8z" fill="var(--bi-fill, transparent)" />
        </g>
      );
    case 'upload':
      return (
        <g {...STROKE}>
          <path d="M7 18h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 10.6 3.8 3.8 0 0 0 7 18z" />
          <g className="bi-up">
            <path d="M12 16v-5m0 0-2.2 2.2M12 11l2.2 2.2" />
          </g>
        </g>
      );
    case 'check':
      return (
        <g {...STROKE} strokeWidth={2}>
          <circle cx="12" cy="12" r="8.5" />
          <path className="bi-tick" d="m8 12.3 2.7 2.7L16 9.5" />
          {[0, 72, 144, 216, 288].map(a => (
            <circle
              key={a}
              className="bi-spark"
              cx="12"
              cy="12"
              r="1"
              fill="currentColor"
              stroke="none"
              style={{ '--a': `${a}deg` } as React.CSSProperties}
            />
          ))}
        </g>
      );
    case 'heart':
      return (
        <g {...STROKE} strokeWidth={1.9}>
          <path className="bi-heart" d={HEART_PATH} />
          {[0, 60, 120, 180, 240, 300].map(a => (
            <circle
              key={a}
              className="bi-spark"
              cx="12"
              cy="12"
              r="1.1"
              fill="currentColor"
              stroke="none"
              style={{ '--a': `${a}deg` } as React.CSSProperties}
            />
          ))}
        </g>
      );
    case 'bell':
      return (
        <g {...STROKE} className="bi-bell">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <path d="M10 20.5a2 2 0 0 0 4 0" />
        </g>
      );
    case 'download':
      return (
        <g {...STROKE} strokeWidth={2}>
          <g className="bi-arr">
            <path d="M12 3.5v10m0 0-4-4m4 4 4-4" />
          </g>
          <path className="bi-tray" d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
        </g>
      );
    case 'alert':
      return (
        <g {...STROKE} strokeWidth={1.9} className="bi-shake">
          <path d="M12 3.5 21.5 20h-19z" />
          <path d="M12 10v4.5M12 17.3v.2" />
        </g>
      );
    case 'info':
      return (
        <g {...STROKE} strokeWidth={1.9}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5.5M12 7.8v.2" />
        </g>
      );
    case 'lock':
      return (
        <g {...STROKE}>
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
          <path className="bi-shackle" d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
        </g>
      );
    case 'headphones':
      return (
        <g {...STROKE}>
          <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
          <rect x="3" y="14" width="4.5" height="6.5" rx="1.8" />
          <rect x="16.5" y="14" width="4.5" height="6.5" rx="1.8" />
        </g>
      );
  }
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, play, filled, className, title }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (typeof play !== 'number' || play === 0) return;
    const el = ref.current;
    if (!el) return;
    // Repornește animația CSS: scoate clasa, forțează un reflow, pune-o la loc.
    el.classList.remove('go');
    void el.getBoundingClientRect();
    el.classList.add('go');
  }, [play]);

  const classes = ['bi', `bi-${name}`];
  if (play === true) classes.push('loop');
  if (filled) classes.push('filled');
  if (className) classes.push(className);

  return (
    <svg
      ref={ref}
      className={classes.join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <Shape name={name} />
    </svg>
  );
};
