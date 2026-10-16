import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKeys } from '../i18n/en';
import './HelpTip.css';

const TIPS: { title: TranslationKeys; text: TranslationKeys }[] = [
  { title: 'help_wheel_title', text: 'help_wheel_text' },
  { title: 'help_tempo_title', text: 'help_tempo_text' },
  { title: 'help_search_title', text: 'help_search_text' },
  { title: 'help_save_title', text: 'help_save_text' },
  { title: 'help_play_title', text: 'help_play_text' },
  { title: 'help_credits_title', text: 'help_credits_text' },
];

/**
 * Butonul mic „?” din Descoperă: câteva rânduri despre cum se folosește
 * pagina, în limba aplicației. Se închide la click în afară sau Esc.
 */
export const HelpTip: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="help-tip" ref={rootRef}>
      <button
        type="button"
        className={`help-btn${open ? ' on' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={t('help_title')}
        title={t('help_title')}
      >
        ?
      </button>
      {open && (
        <div className="help-pop" role="dialog" aria-label={t('help_title')}>
          <h3>{t('help_title')}</h3>
          <dl>
            {TIPS.map(tip => (
              <div key={tip.title}>
                <dt>{t(tip.title)}</dt>
                <dd>{t(tip.text)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};
