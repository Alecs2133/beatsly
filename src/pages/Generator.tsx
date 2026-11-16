import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { Check, ChevronDown, Download, GripVertical, Loader2, Pause, Piano, Play, RefreshCw, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useGeneratorStore, fileNameFor, type GenItem } from '../store/useGeneratorStore';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKeys } from '../i18n/en';
import { hasProducerTools } from '../lib/roles';
import { ALL_KEYS } from '../lib/musicKey';
import type { Variant } from '../lib/generator/space';
import { getHfToken, setHfToken, whoami } from '../lib/generator/hfToken';
import { Segmented } from '../components/Segmented';
import { ToolHeader, ToolLocked } from '../components/ToolPage';
import './Generator.css';

/** Idei de pornire. Promptul rămâne în engleză — modelul a fost antrenat așa. */
const IDEAS: { label: string; prompt: string; variant: Variant }[] = [
  { label: '808 trap', prompt: 'Hard distorted trap 808 bass, long tail', variant: 'small-sfx' },
  { label: 'Lo-fi piano', prompt: 'Lo-fi piano chords, warm, vinyl crackle', variant: 'small-music' },
  { label: 'House kick', prompt: 'Punchy house kick drum, tight, clean', variant: 'small-sfx' },
  { label: 'Riser', prompt: 'Cinematic white noise riser, building tension', variant: 'small-sfx' },
  { label: 'Drill hats', prompt: 'UK drill hi-hat loop, sliding triplet rolls', variant: 'small-music' },
  { label: 'Ambient pad', prompt: 'Evolving ambient pad, airy, lush reverb', variant: 'small-music' },
  { label: 'Guitar', prompt: 'Melancholic acoustic guitar melody loop', variant: 'small-music' },
  { label: 'Snare', prompt: 'Crispy trap snare with a short room reverb', variant: 'small-sfx' },
];

const VARIANTS: { value: Variant; label: TranslationKeys; hint: TranslationKeys; seconds: number; max: number }[] = [
  { value: 'small-sfx', label: 'gen_type_sfx', hint: 'gen_type_sfx_hint', seconds: 3, max: 10 },
  { value: 'small-music', label: 'gen_type_loop', hint: 'gen_type_loop_hint', seconds: 8, max: 30 },
  { value: 'medium', label: 'gen_type_pro', hint: 'gen_type_pro_hint', seconds: 10, max: 30 },
];

const BARS = [1, 2, 4, 8];
const MAX_PROMPT = 300;
/** Câte generări pot aștepta odată — cota GPU e a userului, nu vrem s-o ardă din greșeală. */
const MAX_PENDING = 2;

const isPending = (it: GenItem) => it.phase === 'queue' || it.phase === 'generating' || it.phase === 'download';

/** Tonalitatea scrisă cum o înțelege modelul: „Eb major”, „C# minor”. */
function keyText(index: number): string {
  const k = ALL_KEYS[index];
  return k.key.mode === 'minor' ? `${k.label.slice(0, -1)} minor` : `${k.label} major`;
}

export const Generator: React.FC = () => {
  const { t } = useTranslation();
  const profile = useAuthStore(s => s.profile);
  const allowed = hasProducerTools(profile?.tier, profile?.role);
  const { items, start } = useGeneratorStore();

  const [text, setText] = useState('');
  const [variant, setVariant] = useState<Variant>('small-sfx');
  const [bpm, setBpm] = useState('');
  const [keyIndex, setKeyIndex] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(3);
  const [bars, setBars] = useState(2);

  const spec = VARIANTS.find(v => v.value === variant)!;
  const bpmNum = Number(bpm);
  const bpmValid = bpm !== '' && Number.isFinite(bpmNum) && bpmNum >= 40 && bpmNum <= 300;
  const useBars = variant !== 'small-sfx' && bpmValid;
  const barSeconds = (b: number) => (b * 4 * 60) / bpmNum;
  // La tempo mic, 8 măsuri pot trece de limita tipului — rămâne cea mai lungă
  // variantă permisă, nu o selecție invizibilă care blochează butonul.
  const allowedBars = BARS.filter(b => barSeconds(b) <= spec.max);
  const barsUsed = allowedBars.includes(bars) ? bars : allowedBars[allowedBars.length - 1] ?? 1;
  const finalSeconds = useBars ? Math.round(barSeconds(barsUsed) * 100) / 100 : seconds;
  const pending = items.filter(isPending).length;
  const canGenerate = text.trim().length > 0 && pending < MAX_PENDING && finalSeconds <= spec.max;

  const pickVariant = (v: Variant) => {
    setVariant(v);
    const s = VARIANTS.find(x => x.value === v)!;
    setSeconds(Math.min(s.max, s.seconds));
  };

  const generateNow = () => {
    if (!canGenerate) return;
    start({
      text,
      variant,
      seconds: finalSeconds,
      bpm: variant !== 'small-sfx' && bpmValid ? bpmNum : null,
      keyLabel: keyIndex != null ? ALL_KEYS[keyIndex].label : null,
      keyText: keyIndex != null ? keyText(keyIndex) : null,
    });
  };

  if (!allowed) {
    return (
      <div className="gen-page">
        <ToolHeader title={t('nav_ai_generator')} subtitle={t('gen_subtitle')} badge={t('midi_plan_badge')} />
        <ToolLocked
          title={t('gen_locked_title')}
          text={t('gen_locked_text')}
          art={Array.from({ length: 40 }, (_, i) => (
            <i key={i} style={{ left: `${2 + i * 2.45}%`, top: '50%', width: '1.2%', height: `${20 + Math.abs(Math.sin(i * 1.3)) * 50}%`, transform: 'translateY(-50%)' }} />
          ))}
        />
      </div>
    );
  }

  return (
    <div className="gen-page">
      <ToolHeader title={t('nav_ai_generator')} subtitle={t('gen_subtitle')} badge={t('midi_plan_badge')} />

      <div className="gen-layout">
        <section className="gen-composer">
          <label className="gen-label" htmlFor="gen-prompt">{t('gen_prompt_label')}</label>
          <div className="gen-prompt-box">
            <textarea
              id="gen-prompt"
              className="gen-prompt"
              rows={4}
              maxLength={MAX_PROMPT}
              placeholder={t('gen_prompt_placeholder')}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  generateNow();
                }
              }}
              autoFocus
            />
            <span className="gen-count num">{text.length}/{MAX_PROMPT}</span>
          </div>
          <small className="gen-small">{t('gen_prompt_hint')}</small>

          <div className="gen-ideas">
            {IDEAS.map(idea => (
              <button
                key={idea.label}
                type="button"
                className={`gen-idea${text === idea.prompt ? ' on' : ''}`}
                onClick={() => { setText(idea.prompt); pickVariant(idea.variant); }}
              >
                {idea.label}
              </button>
            ))}
          </div>

          <div className="gen-field">
            <span className="gen-label">{t('gen_type')}</span>
            <Segmented
              ariaLabel={t('gen_type')}
              value={variant}
              onChange={v => pickVariant(v as Variant)}
              options={VARIANTS.map(v => ({ value: v.value, label: t(v.label) }))}
            />
            <small className="gen-small">{t(spec.hint)}</small>
          </div>

          <div className="gen-row">
            {variant !== 'small-sfx' && (
              <label className="gen-field">
                <span className="gen-label">{t('gen_bpm')}</span>
                <span className="gen-bpm">
                  <input
                    className={`gen-input num${bpm && !bpmValid ? ' bad' : ''}`}
                    value={bpm}
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="—"
                    onChange={e => setBpm(e.target.value.replace(/\D/g, ''))}
                  />
                  <em>BPM</em>
                </span>
              </label>
            )}
            <label className="gen-field">
              <span className="gen-label">{t('gen_key')}</span>
              <select
                className="gen-input gen-select"
                value={keyIndex ?? ''}
                onChange={e => setKeyIndex(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">{t('gen_key_any')}</option>
                {ALL_KEYS.map((k, i) => (
                  <option key={k.label} value={i}>{k.key.mode === 'major' ? `${k.label}maj` : k.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="gen-field">
            <span className="gen-label">
              {t('gen_length')} <em className="num">{finalSeconds.toFixed(finalSeconds % 1 ? 1 : 0)} s</em>
            </span>
            {useBars ? (
              <Segmented
                ariaLabel={t('gen_length')}
                value={String(barsUsed)}
                onChange={v => setBars(Number(v))}
                options={allowedBars.map(b => ({ value: String(b), label: t(b === 1 ? 'gen_bar' : 'gen_bars', { n: b }) }))}
              />
            ) : (
              <input type="range" min={1} max={spec.max} step={0.5} value={seconds} onChange={e => setSeconds(Number(e.target.value))} />
            )}
          </div>

          <button type="button" className="btn-primary-pill gen-go" disabled={!canGenerate} onClick={generateNow}>
            <Sparkles size={16} /> {t('gen_generate')}
            <kbd>Ctrl ↵</kbd>
          </button>
          {pending >= MAX_PENDING && <small className="gen-small">{t('gen_wait_pending')}</small>}
          <p className="gen-credit">{t('gen_powered')}</p>
          <HfConnect />
        </section>

        <GenResults items={items} />
      </div>
    </div>
  );
};

/**
 * Lista generărilor și redarea lor. Separat de formular: poziția de redare se
 * schimbă de 60 de ori pe secundă și n-are de ce să redeseneze și formularul.
 */
const GenResults: React.FC<{ items: GenItem[] }> = ({ items }) => {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const playingRef = useRef<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [position, setPosition] = useState(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioRef.current?.pause();
    playingRef.current = null;
    setPlayingId(null);
    setPosition(0);
  }, []);

  // Stabilă (fără dependențe), ca un card să nu se redeseneze doar pentru că
  // altul cântă.
  const play = useCallback((item: GenItem, at = 0) => {
    if (!item.url) return;
    if (playingRef.current === item.id && at === 0) return stop();
    // Nu peste player-ul de jos.
    const player = usePlayerStore.getState();
    if (player.isPlaying) player.togglePlay();
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (a.src !== item.url) a.src = item.url;
    a.onended = stop;
    const seek = () => {
      a.onloadedmetadata = null;
      if (a.duration) a.currentTime = at * a.duration;
    };
    if (a.readyState >= 1) seek(); else a.onloadedmetadata = seek;
    a.play().catch(() => {});
    playingRef.current = item.id;
    setPlayingId(item.id);
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      if (a.duration) setPosition(a.currentTime / a.duration);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stop]);

  // Sunetul care cântă a fost șters → oprim.
  useEffect(() => {
    if (playingId != null && !items.some(it => it.id === playingId)) stop();
  }, [items, playingId, stop]);

  // Pornește player-ul de jos → tăcem aici, ca să nu cânte două odată.
  useEffect(() => usePlayerStore.subscribe(s => { if (s.isPlaying && playingRef.current != null) stop(); }), [stop]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    audioRef.current?.pause();
  }, []);

  return (
    <section className="gen-results" aria-live="polite">
      <div className="gen-results-head">
        <h2>{t('gen_session')}</h2>
        {items.length > 0 && <span className="num">{items.length}</span>}
      </div>
      {items.length === 0 ? (
        <div className="gen-empty">
          <div className="gen-empty-wave" aria-hidden>
            {Array.from({ length: 32 }, (_, i) => <i key={i} style={{ '--i': i, '--h': `${20 + ((i * 37) % 70)}%` } as React.CSSProperties} />)}
          </div>
          <p>{t('gen_empty')}</p>
        </div>
      ) : (
        items.map(item => (
          <GenCard
            key={item.id}
            item={item}
            playing={playingId === item.id}
            position={playingId === item.id ? position : 0}
            onPlay={play}
          />
        ))
      )}
    </section>
  );
};

function formatWait(sec: number, t: ReturnType<typeof useTranslation>['t']): string {
  const min = Math.max(1, Math.round(sec / 60));
  if (min < 60) return t('gen_in_min', { n: min });
  const h = Math.floor(min / 60);
  return t('gen_in_h', { h, m: min % 60 });
}

const VARIANT_LABEL: Record<Variant, TranslationKeys> = {
  'small-sfx': 'gen_type_sfx',
  'small-music': 'gen_type_loop',
  medium: 'gen_type_pro',
};

interface GenCardProps {
  item: GenItem;
  playing: boolean;
  position: number;
  onPlay: (item: GenItem, at?: number) => void;
}

const GenCard = memo(function GenCard({ item, playing, position, onPlay }: GenCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showToast = useAppStore(s => s.showToast);
  // Selectori, nu tot store-ul: altfel fiecare card s-ar redesena la orice schimbare din listă.
  const again = useGeneratorStore(st => st.again);
  const cancel = useGeneratorStore(st => st.cancel);
  const remove = useGeneratorStore(st => st.remove);

  const meta = (
    <div className="gen-meta">
      <span>{t(VARIANT_LABEL[item.params.variant])}</span>
      <span className="num">{item.params.seconds.toFixed(item.params.seconds % 1 ? 1 : 0)} s</span>
      {item.bpm && <span className="num">{item.bpm} BPM</span>}
      {item.keyLabel && <span>{item.keyLabel}</span>}
    </div>
  );

  if (isPending(item)) {
    const pct =
      item.phase === 'queue' ? 4 : item.phase === 'download' ? 96 : Math.round(8 + item.progress * 86);
    const status =
      item.phase === 'queue'
        ? item.queueRank
          ? t('gen_queue', { n: item.queueRank + 1 })
          : t('gen_starting')
        : item.phase === 'download'
          ? t('gen_downloading')
          : t('gen_generating');
    return (
      <article className="gen-card pending">
        <div className="gen-card-top">
          <p className="gen-text">{item.text}</p>
          <button type="button" className="gen-icon" onClick={() => cancel(item.id)} aria-label={t('midi_overlay_cancel')} title={t('midi_overlay_cancel')}>
            <X size={15} />
          </button>
        </div>
        <div className="gen-wave pending" aria-hidden>
          {Array.from({ length: 56 }, (_, i) => <i key={i} style={{ '--i': i, '--h': `${18 + ((i * 29) % 60)}%` } as React.CSSProperties} />)}
        </div>
        <div className="gen-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="gen-status">
          <span>{status}</span>
          <span className="num">
            {item.phase === 'queue' && item.etaSec ? `~${Math.max(1, Math.round(item.etaSec))} s` : `${pct}%`}
          </span>
        </div>
        {meta}
      </article>
    );
  }

  if (item.phase === 'error') {
    const e = item.error;
    const msg =
      e?.kind === 'quota'
        ? (e.retryInSec
          ? t('gen_err_quota', { when: formatWait(e.retryInSec, t) })
          : t('gen_err_quota_plain')) + (getHfToken() ? '' : ' ' + t('gen_err_quota_connect'))
        : e?.kind === 'auth'
          ? t('gen_err_auth')
        : e?.kind === 'busy'
          ? t('gen_err_busy')
          : e?.kind === 'down'
            ? t('gen_err_down')
            : t('gen_err_failed');
    return (
      <article className="gen-card error">
        <div className="gen-card-top">
          <p className="gen-text">{item.text}</p>
          <button type="button" className="gen-icon" onClick={() => remove(item.id)} aria-label={t('gen_remove')} title={t('gen_remove')}>
            <X size={15} />
          </button>
        </div>
        <p className="gen-error">{msg}</p>
        {e?.kind !== 'quota' && (
          <button type="button" className="btn-ghost-pill gen-retry" onClick={() => { again(item.id); remove(item.id); }}>
            <RefreshCw size={14} /> {t('gen_retry')}
          </button>
        )}
      </article>
    );
  }

  const saveWav = async () => {
    if (!item.blob) return;
    try {
      const path = await save({ defaultPath: fileNameFor(item), filters: [{ name: 'WAV', extensions: ['wav'] }] });
      if (!path) return;
      await writeFile(path, new Uint8Array(await item.blob.arrayBuffer()));
      showToast(t('gen_saved'), 'success');
    } catch (err) {
      console.error('Save WAV failed:', err);
      showToast(t('gen_save_failed'), 'error');
    }
  };

  const peaks = item.peaks ?? [];
  return (
    <article className={`gen-card done${playing ? ' playing' : ''}`}>
      <div className="gen-player">
        <button type="button" className={`gen-play${playing ? ' on' : ''}`} onClick={() => onPlay(item)} aria-label={t('midi_listen')}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div
          className="gen-wave"
          role="slider"
          aria-label={t('midi_listen')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position * 100)}
          tabIndex={0}
          onClick={e => {
            const r = e.currentTarget.getBoundingClientRect();
            onPlay(item, Math.min(0.999, Math.max(0, (e.clientX - r.left) / r.width)));
          }}
          onKeyDown={e => {
            // Tastatură: Enter/Space pornesc/opresc, săgețile sar câte 10%.
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay(item); }
            if (e.key === 'ArrowRight') { e.preventDefault(); onPlay(item, Math.min(0.999, position + 0.1)); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); onPlay(item, Math.max(0.001, position - 0.1)); }
          }}
        >
          {peaks.map((p, i) => (
            <i key={i} className={(i + 0.5) / peaks.length <= position ? 'lit' : ''} style={{ height: `${Math.max(6, p * 100)}%` }} />
          ))}
        </div>
      </div>
      <p className="gen-text">{item.text}</p>
      <div className="gen-foot">
        {meta}
        <div className="gen-actions">
          <button type="button" className="gen-icon" onClick={() => again(item.id)} title={t('gen_again')} aria-label={t('gen_again')}>
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            className="gen-icon"
            disabled={!item.path}
            onClick={() => item.path && navigate('/midi', { state: { path: item.path } })}
            title={t('gen_to_midi')}
            aria-label={t('gen_to_midi')}
          >
            <Piano size={15} />
          </button>
          <button type="button" className="gen-icon" onClick={() => remove(item.id)} title={t('gen_remove')} aria-label={t('gen_remove')}>
            <Trash2 size={15} />
          </button>
          <div
            className={`gen-drag${item.path ? '' : ' wait'}`}
            draggable={!!item.path}
            onDragStart={e => {
              e.preventDefault();
              if (item.path) startDrag({ item: [item.path], icon: 'icon.png' }).catch(err => console.error('startDrag:', err));
            }}
            title={t('gen_drag_hint')}
          >
            <GripVertical size={14} /> {t('midi_drag')}
          </div>
          <button type="button" className="btn-primary-pill gen-save" onClick={saveWav}>
            <Download size={14} /> {t('gen_save')}
          </button>
        </div>
      </div>
    </article>
  );
});

/**
 * Opțional: contul gratuit Hugging Face al userului. Fără el cota GPU e pe IP
 * și ajunge pentru puține generări pe zi; cu el, de câteva ori mai multe.
 */
const HfConnect: React.FC = () => {
  const { t } = useTranslation();
  const showToast = useAppStore(s => s.showToast);
  const [token, setToken] = useState(getHfToken);
  const [name, setName] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    whoami(token)
      .then(n => { setName(n); setInvalid(false); })
      .catch(e => { setName(null); setInvalid(e instanceof Error && e.message === 'invalid_token'); });
  }, [token]);

  const connect = async () => {
    const value = draft.trim();
    if (!value) return;
    setChecking(true);
    setErr('');
    try {
      const n = await whoami(value);
      setHfToken(value);
      setToken(value);
      setName(n);
      setDraft('');
      setOpen(false);
      showToast(t('gen_hf_connected', { name: n }), 'success');
    } catch (e) {
      setErr(e instanceof Error && e.message === 'invalid_token' ? t('gen_hf_invalid') : t('gen_hf_check_failed'));
    } finally {
      setChecking(false);
    }
  };

  const disconnect = () => {
    setHfToken(null);
    setToken(null);
    setName(null);
    setInvalid(false);
  };

  if (token) {
    return (
      <div className={`gen-hf on${invalid ? ' bad' : ''}`}>
        {invalid ? <X size={14} /> : <Check size={14} />}
        <span>{invalid ? t('gen_hf_expired') : t('gen_hf_as', { name: name ?? '…' })}</span>
        <button type="button" className="gen-link" onClick={disconnect}>{t('gen_hf_disconnect')}</button>
      </div>
    );
  }

  return (
    <div className={`gen-hf${open ? ' open' : ''}`}>
      <button type="button" className="gen-hf-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <Zap size={14} /> {t('gen_hf_more')} <ChevronDown size={14} className="gen-hf-chev" />
      </button>
      {open && (
        <div className="gen-hf-body">
          <p>{t('gen_hf_explain')}</p>
          <ol>
            <li>
              {t('gen_hf_step1')}{' '}
              <button type="button" className="gen-link" onClick={() => openUrl('https://huggingface.co/join').catch(() => {})}>huggingface.co/join</button>
            </li>
            <li>
              {t('gen_hf_step2')}{' '}
              <button type="button" className="gen-link" onClick={() => openUrl('https://huggingface.co/settings/tokens/new?tokenType=read').catch(() => {})}>
                {t('gen_hf_step2_link')}
              </button>
            </li>
            <li>{t('gen_hf_step3')}</li>
          </ol>
          <div className="gen-hf-row">
            <input
              type="password"
              className="gen-input"
              placeholder="hf_…"
              value={draft}
              autoComplete="off"
              spellCheck={false}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') connect(); }}
            />
            <button type="button" className="btn-ghost-pill" disabled={checking || !draft.trim()} onClick={connect}>
              {checking ? <Loader2 size={14} className="spin" /> : t('gen_hf_connect')}
            </button>
          </div>
          {err && <p className="gen-error">{err}</p>}
          <small className="gen-small">{t('gen_hf_private')}</small>
        </div>
      )}
    </div>
  );
};
