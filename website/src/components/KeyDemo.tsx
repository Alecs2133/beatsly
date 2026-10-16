import { useMemo, useState } from 'react';
import { CamelotWheel } from './CamelotWheel';
import { ALL_KEYS, isHarmonicallyCompatible, parseKey, toCamelot } from '../lib/musicKey';
import { useT } from '../i18n/context';

/** Sunete de exemplu — doar pentru demo, nu vin din bibliotecă. */
const DEMO = [
  { title: 'Dusty Rhodes Chop', author: 'mirceabeats', bpm: 90, key: 'Am' },
  { title: 'Late Night 808', author: 'ana.k', bpm: 140, key: 'C' },
  { title: 'Detroit Chords', author: 'groovelab', bpm: 122, key: 'Em' },
  { title: 'Soul Vocal Chop', author: 'ana.k', bpm: 88, key: 'G' },
  { title: 'Moog Bassline', author: 'groovelab', bpm: 124, key: 'Dm' },
  { title: 'Pluck Arp', author: 'mirceabeats', bpm: 128, key: 'F#m' },
  { title: 'Choir Swell', author: 'groovelab', bpm: 90, key: 'Bb' },
];

/** Bare de waveform fixe pe titlu, ca să nu se schimbe la fiecare randare. */
function bars(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: 28 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const env = Math.sin((i / 27) * Math.PI) * 0.6 + 0.4;
    return Math.round((25 + (h % 75)) * env);
  });
}

/**
 * Bucată din ecranul „Descoperă”: alegi o tonalitate pe roată și lista se
 * aprinde după aceeași regulă Camelot pe care o folosește aplicația.
 */
export function KeyDemo() {
  const { t } = useT();
  // 8A (La minor) ales de la început — se vede imediat ce face roata.
  const [value, setValue] = useState<number | null>(() => ALL_KEYS.findIndex(k => toCamelot(k.key) === '8A'));
  const ref = value == null ? null : ALL_KEYS[value];

  const rows = useMemo(
    () =>
      DEMO.map(s => {
        const parsed = parseKey(s.key)!;
        const match = !ref || isHarmonicallyCompatible(ref.key, parsed);
        return { ...s, code: toCamelot(parsed), match, bars: bars(s.title) };
      }),
    [ref]
  );
  const matches = rows.filter(r => r.match).length;

  return (
    <div className="demo-window" aria-label={t('demo_label')}>
      <div className="demo-bar">
        <span className="demo-dots" aria-hidden><i /><i /><i /></span>
        <span>{t('demo_title')}</span>
        <span className="demo-tag">{t('demo_example')}</span>
      </div>
      <div className="demo-body">
        <div className="demo-wheel">
          <CamelotWheel value={value} onChange={setValue} anyLabel={t('demo_any')} subLabel={t('demo_key')} />
        </div>
        <div className="demo-list">
          <p className="demo-count">
            {ref
              ? t('demo_matches', { n: matches, total: rows.length, key: `${toCamelot(ref.key)} · ${ref.label}` })
              : t('demo_all', { total: rows.length })}
          </p>
          <ul>
            {rows.map(r => (
              <li key={r.title} className={r.match ? 'on' : 'off'}>
                <span className="demo-wave" aria-hidden>
                  {r.bars.map((b, i) => <i key={i} style={{ height: `${b}%` }} />)}
                </span>
                <span className="demo-meta">
                  <b>{r.title}</b>
                  <small>{r.author}</small>
                </span>
                <span className="demo-chip num">{r.bpm}</span>
                <span className="demo-chip key num">{r.code} · {r.key}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
