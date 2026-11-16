import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKeys } from '../../i18n/en';
import type { LoadStage, Stage } from '../../lib/midi/transcribe';
import './AnalyzeOverlay.css';

const ANALYZE_STAGES: { id: Stage; label: TranslationKeys }[] = [
  { id: 'read', label: 'midi_stage_read' },
  { id: 'decode', label: 'midi_stage_decode' },
  { id: 'model', label: 'midi_stage_model' },
  { id: 'analyze', label: 'midi_stage_analyze' },
];

const LOAD_STAGES: { id: LoadStage; label: TranslationKeys }[] = [
  { id: 'read', label: 'midi_stage_read' },
  { id: 'decode', label: 'midi_stage_decode' },
  { id: 'tempo', label: 'midi_stage_tempo' },
];

/** Înălțimile barelor — fixe, ca forma să nu sară între randări. */
const WAVE = Array.from({ length: 56 }, (_, i) => {
  const env = Math.sin((i / 55) * Math.PI) * 0.6 + 0.25;
  const wobble = Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
  return Math.min(1, 0.12 + env * (0.5 + wobble * 0.7));
});

type AnalyzeOverlayProps = {
  fileName: string;
  /** 0–1, pe toată analiza. */
  progress: number;
  etaSec: number | null;
  onCancel: () => void;
} & (
  | { kind: 'analyze'; stage: Stage }
  /** Încărcarea sunetului, imediat după drop — înainte de analiză. */
  | { kind: 'load'; stage: LoadStage }
);

/**
 * Ecranul de analiză: pagina rămâne în spate, în blur, cu o bară de progres
 * pe etape. Modelul rulează în worker, deci aplicația nu îngheață — iar
 * „Anulează” (sau Esc) oprește analiza pe loc.
 */
export const AnalyzeOverlay: React.FC<AnalyzeOverlayProps> = props => {
  const { fileName, progress, etaSec, onCancel } = props;
  const { t } = useTranslation();
  const stages: { id: string; label: TranslationKeys }[] = props.kind === 'load' ? LOAD_STAGES : ANALYZE_STAGES;
  const current = stages.findIndex(s => s.id === props.stage);
  const loading = props.kind === 'load';
  const pct = Math.round(progress * 100);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div className={`az-overlay${loading ? ' load' : ''}`} role="dialog" aria-modal="true" aria-labelledby="az-title">
      <div className="az-card">
        {loading ? (
          /* La încărcare: o formă de undă care se „umple” odată cu bara */
          <div className="az-roll az-wave" aria-hidden>
            {WAVE.map((h, i) => (
              <i key={i} className={i / WAVE.length < progress ? 'lit' : ''} style={{ '--h': h, '--i': i } as React.CSSProperties} />
            ))}
          </div>
        ) : (
        /* Un mic piano roll care „scanează” cât lucrează modelul */
        <div className="az-roll" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ '--i': i, top: `${10 + ((i * 37) % 70)}%`, left: `${(i * 11) % 80}%`, width: `${10 + ((i * 7) % 16)}%` } as React.CSSProperties} />
          ))}
          <span className="az-scan" style={{ left: `${Math.min(98, pct)}%` }} />
        </div>
        )}

        <h2 id="az-title">{t(loading ? 'midi_load_title' : 'midi_overlay_title')}</h2>
        <p className="az-file">{fileName}</p>

        <div className="az-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
        <div className="az-meta">
          <span className="num">{pct}%</span>
          <span>{etaSec != null && props.stage === 'analyze' ? t('midi_overlay_eta', { sec: Math.max(1, etaSec) }) : t('midi_overlay_wait')}</span>
        </div>

        <ol className="az-steps">
          {stages.map((s, i) => (
            <li key={s.id} className={i < current ? 'done' : i === current ? 'now' : ''}>
              <span className="az-dot">
                {i < current ? <Check size={12} /> : i === current ? <Loader2 size={12} className="spin" /> : null}
              </span>
              {t(s.label)}
            </li>
          ))}
        </ol>

        <button type="button" className="btn-ghost-pill az-cancel" onClick={onCancel}>
          <X size={15} /> {t('midi_overlay_cancel')}
        </button>
        <p className="az-hint">{t(loading ? 'midi_load_hint' : 'midi_overlay_hint')}</p>
      </div>
    </div>,
    document.body
  );
};
