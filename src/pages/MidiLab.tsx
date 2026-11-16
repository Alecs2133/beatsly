import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { join, tempDir } from '@tauri-apps/api/path';
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import { Download, FolderOpen, GripVertical, Loader2, Music2, Pause, Play, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { hasProducerTools } from '../lib/roles';
import { errorMessage } from '../lib/errors';
import { Segmented } from '../components/Segmented';
import { ToolHeader, ToolLocked } from '../components/ToolPage';
import { PianoRoll } from '../components/midi/PianoRoll';
import { Cancelled, decodeForModel, extractNotes, readWithProgress, runModel, MAX_SECONDS, type Analysis, type LoadStage, type Stage } from '../lib/midi/transcribe';
import type { DetectedNote } from '../lib/midi/notes';
import { AnalyzeOverlay } from '../components/midi/AnalyzeOverlay';
import { keepSingleVoice, noteStats, pitchName, toGrid, trimOverlaps, type GridSize } from '../lib/midi/notes';
import { estimateKey } from '../lib/midi/key';
import { writeMidi } from '../lib/midi/writeMidi';
import { playNotes, type MidiPlayer } from '../lib/midi/playback';
import './MidiLab.css';

const AUDIO_EXT = ['wav', 'mp3', 'flac', 'ogg', 'm4a'];
const isAudio = (p: string) => AUDIO_EXT.includes(p.split('.').pop()?.toLowerCase() ?? '');
const baseName = (p: string) => (p.split(/[\\/]/).pop() ?? p).replace(/\.[^/.]+$/, '');

type Mode = 'melody' | 'chords';
type Status = 'idle' | 'working' | 'done' | 'error';

/** Cât așteptăm tempo-ul din Rust înainte să închidem ecranul de încărcare. */
const TEMPO_WAIT_MS = 6000;
/** Ecranul de încărcare stă măcar atât, ca să nu clipească la fișiere mici. */
const LOAD_MIN_MS = 600;
const sleep = (ms: number) => new Promise<void>(r => window.setTimeout(r, ms));


/**
 * MIDI Deconstructor: tragi un sunet, îi spui tempo-ul, iar notele din el
 * devin un fișier MIDI pe care îl tragi direct în piano roll-ul din DAW.
 * Totul rulează local (Basic Pitch, vezi lib/midi/transcribe.ts).
 */
export const MidiLab: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useAuthStore(s => s.profile);
  const showToast = useAppStore(s => s.showToast);
  const allowed = hasProducerTools(profile?.tier, profile?.role);
  const location = useLocation();

  const [dragging, setDragging] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [bpm, setBpm] = useState('');
  const [suggestedBpm, setSuggestedBpm] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('melody');
  const [grid, setGrid] = useState<GridSize>(0.25);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [minNoteMs, setMinNoteMs] = useState(50);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<Stage>('read');
  const [etaSec, setEtaSec] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [loadStage, setLoadStage] = useState<LoadStage | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  /** Audio-ul decodat la încărcare (22 050 Hz mono) — analiza pornește direct din el. */
  const decodedRef = useRef<AudioBuffer | null>(null);
  /** Reglajele cu care au fost scoase notele curente („sensibilitate|ms”). */
  const extractedRef = useRef('');
  const [output, setOutput] = useState<Analysis | null>(null);
  const [detected, setDetected] = useState<DetectedNote[]>([]);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [playing, setPlaying] = useState<'midi' | 'audio' | null>(null);
  const [dragPath, setDragPath] = useState<string | null>(null);

  const playerRef = useRef<MidiPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);

  const bpmNum = Number(bpm);
  const bpmValid = Number.isFinite(bpmNum) && bpmNum >= 40 && bpmNum <= 300;

  // ---------- fișierul ----------
  // Încărcarea are ecranul ei: citim fișierul (cu progres pe bytes), îl
  // decodăm și așteptăm tempo-ul din Rust — totul în fundal, cu pagina în
  // blur. Un drop nou în timpul încărcării o înlocuiește pe cea veche.
  const loadFile = useCallback(async (path: string) => {
    stopAll();
    abortRef.current?.abort();
    loadAbortRef.current?.abort();
    const abort = new AbortController();
    loadAbortRef.current = abort;
    const isCurrent = () => loadAbortRef.current === abort;
    decodedRef.current = null;
    setFilePath(path);
    setOutput(null);
    setDetected([]);
    setStatus('idle');
    setError('');
    setSuggestedBpm(null);
    setDragPath(null);
    setLoadStage('read');
    setLoadProgress(0);
    const shownAt = performance.now();
    // „Anulează” trebuie să închidă pe loc, nu după ce termină pasul curent.
    const aborted = new Promise<never>((_, reject) => {
      abort.signal.addEventListener('abort', () => reject(new Cancelled()), { once: true });
    });
    aborted.catch(() => {});
    const orAbort = <T,>(p: Promise<T>) => Promise.race([p, aborted]);

    // Decodarea și tempo-ul nu raportează progres — bara înaintează lin spre
    // capătul etapei, fără să-l atingă, până termină etapa de fapt.
    let creep = 0;
    const creepTo = (end: number) => {
      window.clearInterval(creep);
      creep = window.setInterval(() => setLoadProgress(p => p + (end - p) * 0.07), 80);
    };

    try {
      try {
        await invoke('allow_asset_path', { path });
      } catch (err) {
        console.error('allow_asset_path:', err);
      }
      const url = convertFileSrc(path);
      setAssetUrl(url);
      // Tempo-ul (Rust, pe alt fir) pornește în paralel cu citirea.
      const tempo = invoke<{ bpm: number; bpm_confidence: number }>('analyze_sample_audio', { path })
        .then(r => (r.bpm_confidence >= 0.3 && r.bpm > 0 ? Math.round(r.bpm) : null))
        .catch(() => null);

      const data = await readWithProgress(url, p => setLoadProgress(p * 0.4), abort.signal);
      if (abort.signal.aborted) throw new Cancelled();

      setLoadStage('decode');
      setLoadProgress(0.4);
      creepTo(0.78);
      const decoded = await orAbort(decodeForModel(data));
      if (abort.signal.aborted) throw new Cancelled();
      decodedRef.current = decoded;

      setLoadStage('tempo');
      setLoadProgress(p => Math.max(p, 0.78));
      creepTo(0.98);
      const guess = await orAbort(Promise.race([tempo, sleep(TEMPO_WAIT_MS).then(() => undefined)]));
      if (abort.signal.aborted) throw new Cancelled();
      if (guess) setSuggestedBpm(guess);
      // Dacă Rust a întârziat, sugestia apare când e gata — nu mai ținem ecranul.
      else if (guess === undefined) tempo.then(b => { if (b && !abort.signal.aborted) setSuggestedBpm(b); });

      window.clearInterval(creep);
      setLoadProgress(1);
      const rest = LOAD_MIN_MS - (performance.now() - shownAt);
      await orAbort(sleep(Math.max(180, rest)));
    } catch (err) {
      if (!isCurrent()) return; // a venit alt fișier între timp
      decodedRef.current = null;
      setFilePath(null);
      setAssetUrl(null);
      if (!(err instanceof Cancelled) && !abort.signal.aborted) {
        const msg = errorMessage(err);
        showToast(msg.startsWith('too_long') ? t('midi_too_long', { max: MAX_SECONDS }) : `${t('midi_load_failed')} ${msg}`, 'error');
      }
    } finally {
      window.clearInterval(creep);
      if (isCurrent()) {
        loadAbortRef.current = null;
        setLoadStage(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast, t]);

  const cancelLoad = useCallback(() => loadAbortRef.current?.abort(), []);

  // Venit din Generatorul AI cu un sunet: îl încărcăm direct.
  const incoming = (location.state as { path?: string } | null)?.path;
  useEffect(() => {
    if (allowed && incoming) {
      loadFile(incoming);
      navigate('.', { replace: true, state: null });
    }
  }, [allowed, incoming, loadFile, navigate]);

  useEffect(() => {
    if (!allowed) return;
    const unlisten = getCurrentWebview().onDragDropEvent(event => {
      const p = event.payload;
      if (p.type === 'enter' || p.type === 'over') setDragging(true);
      else if (p.type === 'leave') setDragging(false);
      else if (p.type === 'drop') {
        setDragging(false);
        const audio = p.paths.find(isAudio);
        if (audio) loadFile(audio);
        else if (p.paths.length) showToast(t('midi_not_audio'), 'error');
      }
    });
    return () => { unlisten.then(fn => fn()); };
  }, [allowed, loadFile, showToast, t]);

  const pick = async () => {
    const selected = await open({ multiple: false, directory: false, filters: [{ name: 'Audio', extensions: AUDIO_EXT }] });
    if (typeof selected === 'string') loadFile(selected);
  };

  // ---------- analiza ----------
  const analyze = async () => {
    if (!assetUrl || !bpmValid) return;
    stopAll();
    const abort = new AbortController();
    abortRef.current = abort;
    setStatus('working');
    setOutput(null);
    setDetected([]);
    setProgress(0);
    setEtaSec(null);
    setError('');
    // Progresul total pe etape: citire 0–4%, decodare 4–10%, model 10–16%,
    // analiza propriu-zisă 16–100%.
    try {
      // De obicei audio-ul e deja decodat de la încărcare.
      let audio = decodedRef.current;
      if (!audio) {
        setStage('read');
        const data = await readWithProgress(assetUrl, p => setProgress(p * 0.04), abort.signal);
        if (abort.signal.aborted) throw new Cancelled();
        setStage('decode');
        setProgress(0.04);
        audio = await decodeForModel(data);
        if (abort.signal.aborted) throw new Cancelled();
        decodedRef.current = audio;
      }
      setStage('model');
      setProgress(0.1);
      let analyzeStart = 0;
      const out = await runModel(
        audio,
        {
          onStage: st => {
            setStage(st);
            if (st === 'model') setProgress(0.1);
            if (st === 'analyze') {
              setProgress(0.16);
              analyzeStart = performance.now();
            }
          },
          onProgress: p => {
            setProgress(0.16 + p * 0.84);
            if (p > 0.05 && analyzeStart) {
              const elapsed = (performance.now() - analyzeStart) / 1000;
              setEtaSec(Math.max(0, Math.round((elapsed / p) * (1 - p))));
            }
          },
        },
        abort.signal
      );
      setDetected(await extractNotes({ sensitivity, minNoteMs }));
      extractedRef.current = `${sensitivity}|${minNoteMs}`;
      setProgress(1);
      setOutput(out);
      setStatus('done');
    } catch (err) {
      if (err instanceof Cancelled || abort.signal.aborted) {
        // Workerul a fost oprit, deci și analiza veche s-a pierdut — de la capăt.
        setOutput(null);
        setDetected([]);
        setStatus('idle');
        return;
      }
      const msg = errorMessage(err);
      setError(msg.startsWith('too_long') ? t('midi_too_long', { max: MAX_SECONDS }) : `${t('midi_failed')} ${msg}`);
      setStatus('error');
    } finally {
      abortRef.current = null;
    }
  };

  const cancelAnalysis = () => abortRef.current?.abort();

  // Sensibilitatea și lungimea minimă se aplică în worker, pe ieșirea deja
  // calculată — modelul nu mai rulează, iar interfața nu îngheață. Cererile
  // vechi sunt ignorate dacă userul a mutat între timp slider-ul.
  useEffect(() => {
    if (!output) return;
    const wanted = `${sensitivity}|${minNoteMs}`;
    // Imediat după analiză notele sunt deja scoase cu reglajele astea.
    if (extractedRef.current === wanted) return;
    let stale = false;
    setRecalculating(true);
    const timer = window.setTimeout(() => {
      extractNotes({ sensitivity, minNoteMs })
        .then(n => {
          if (stale) return;
          extractedRef.current = wanted;
          setDetected(n);
        })
        .catch(err => console.error('extractNotes:', err))
        .finally(() => { if (!stale) setRecalculating(false); });
    }, 90);
    return () => { stale = true; window.clearTimeout(timer); };
  }, [output, sensitivity, minNoteMs]);

  // Tempo, grilă și mod sunt ieftine — instant, aici.
  const notes = useMemo(() => {
    if (!output || !bpmValid) return [];
    const det = mode === 'melody' ? keepSingleVoice(detected) : detected;
    const placed = toGrid(det, bpmNum, grid);
    return mode === 'melody' ? trimOverlaps(placed) : placed;
  }, [output, detected, mode, grid, bpmNum, bpmValid]);

  const stats = useMemo(() => noteStats(notes), [notes]);
  const key = useMemo(() => estimateKey(notes), [notes]);
  const fileBase = filePath ? baseName(filePath) : 'beatsly';
  const midiName = `${fileBase}_${bpmValid ? bpmNum : 0}bpm`;
  const midiBytes = useMemo(() => (notes.length && bpmValid ? writeMidi(notes, { bpm: bpmNum, name: fileBase }) : null), [notes, bpmNum, bpmValid, fileBase]);

  // Fișierul temporar pentru „trage în DAW” — drag-ul nativ are nevoie de o
  // cale reală pe disc în momentul în care începe.
  useEffect(() => {
    setDragPath(null);
    if (!midiBytes) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const dir = await join(await tempDir(), 'beatsly-midi');
        await mkdir(dir, { recursive: true });
        const path = await join(dir, `${midiName}.mid`);
        await writeFile(path, midiBytes);
        if (!cancelled) setDragPath(path);
      } catch (err) {
        console.error('Temp MIDI write failed:', err);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [midiBytes, midiName]);

  const saveMidi = async () => {
    if (!midiBytes) return;
    try {
      const path = await save({ defaultPath: `${midiName}.mid`, filters: [{ name: 'MIDI', extensions: ['mid'] }] });
      if (!path) return;
      await writeFile(path, midiBytes);
      showToast(t('midi_saved'), 'success');
    } catch (err) {
      showToast(`${t('midi_save_failed')} ${errorMessage(err)}`, 'error');
    }
  };

  // ---------- ascultare ----------
  function stopAll() {
    playerRef.current?.stop();
    playerRef.current = null;
    audioRef.current?.pause();
    cancelAnimationFrame(rafRef.current);
    setPlaying(null);
    setPlayhead(null);
  }

  // Ieși de pe pagină în timpul analizei → o oprim, nu mai are cui să-i răspundă.
  useEffect(() => () => { stopAll(); abortRef.current?.abort(); loadAbortRef.current?.abort(); }, []);

  const tick = () => {
    const pos = playerRef.current?.positionBeats()
      ?? (audioRef.current && !audioRef.current.paused ? (audioRef.current.currentTime * bpmNum) / 60 : null);
    setPlayhead(pos);
    if (pos != null) rafRef.current = requestAnimationFrame(tick);
  };

  const playMidi = () => {
    if (playing === 'midi') return stopAll();
    stopAll();
    playerRef.current = playNotes(notes, bpmNum, () => { playerRef.current = null; setPlaying(null); setPlayhead(null); });
    setPlaying('midi');
    rafRef.current = requestAnimationFrame(tick);
  };

  const playOriginal = () => {
    if (playing === 'audio') return stopAll();
    stopAll();
    if (!assetUrl) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    a.src = assetUrl;
    a.onended = () => stopAll();
    a.play().catch(() => {});
    setPlaying('audio');
    rafRef.current = requestAnimationFrame(tick);
  };

  // ---------- fără abonament ----------
  if (!allowed) {
    return (
      <div className="midi-page">
        <MidiHeader />
        <ToolLocked
          title={t('midi_locked_title')}
          text={t('midi_locked_text')}
          art={Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 7) % 92}%`, top: `${((i * 37) % 80) + 6}%`, width: `${8 + ((i * 13) % 18)}%` }} />
          ))}
        />
      </div>
    );
  }

  return (
    <div className="midi-page">
      <MidiHeader />

      {!filePath ? (
        <div className={`midi-drop${dragging ? ' over' : ''}`}>
          <Music2 size={30} />
          <h2>{dragging ? t('upload_drop_now') : t('midi_drop_title')}</h2>
          <p>{t('midi_drop_hint')}</p>
          <button type="button" className="btn-ghost-pill" onClick={pick}><FolderOpen size={15} /> {t('upload_pick')}</button>
        </div>
      ) : (
        <div className={`midi-file${dragging ? ' over' : ''}`}>
          <button type="button" className={`mf-play${playing === 'audio' ? ' on' : ''}`} onClick={playOriginal} aria-label={t('midi_play_original')}>
            {playing === 'audio' ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="mf-name">
            <b>{fileBase}</b>
            <span>{t('midi_file_hint')}</span>
          </div>
          <button type="button" className="btn-ghost-pill" onClick={pick}><RotateCcw size={14} /> {t('midi_change_file')}</button>
        </div>
      )}

      {filePath && (
        <section className="midi-controls">
          <div className="mc-bpm">
            <label htmlFor="midi-bpm">{t('midi_bpm_label')}</label>
            <div className="mc-bpm-row">
              <input
                id="midi-bpm"
                className={`mc-bpm-input num${bpm && !bpmValid ? ' bad' : ''}`}
                value={bpm}
                inputMode="numeric"
                maxLength={3}
                placeholder="—"
                onChange={e => setBpm(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              <span>BPM</span>
              {suggestedBpm && String(suggestedBpm) !== bpm && (
                <button type="button" className="mc-suggest" onClick={() => setBpm(String(suggestedBpm))}>
                  <Sparkles size={13} /> {t('midi_bpm_suggest', { bpm: suggestedBpm })}
                </button>
              )}
            </div>
            <small>{bpmValid ? t('midi_bpm_ok') : t('midi_bpm_required')}</small>
          </div>

          <div className="mc-field">
            <span>{t('midi_mode')}</span>
            <Segmented
              ariaLabel={t('midi_mode')}
              value={mode}
              onChange={v => setMode(v as Mode)}
              options={[{ value: 'melody', label: t('midi_mode_melody') }, { value: 'chords', label: t('midi_mode_chords') }]}
            />
          </div>

          <div className="mc-field">
            <span>{t('midi_grid')}</span>
            <Segmented
              ariaLabel={t('midi_grid')}
              value={String(grid)}
              onChange={v => setGrid(Number(v) as GridSize)}
              options={[
                { value: '1', label: '1/4' },
                { value: '0.5', label: '1/8' },
                { value: '0.25', label: '1/16' },
                { value: '0.125', label: '1/32' },
                { value: '0', label: t('midi_grid_off') },
              ]}
            />
          </div>

          <label className="mc-field mc-slider">
            <span>{t('midi_sensitivity')} <em className="num">{Math.round(sensitivity * 100)}%</em></span>
            <input type="range" min={0.1} max={0.9} step={0.05} value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))} />
            <small>{t('midi_sensitivity_hint')}</small>
          </label>

          <label className="mc-field mc-slider">
            <span>{t('midi_min_note')} <em className="num">{minNoteMs} ms</em></span>
            <input type="range" min={20} max={250} step={10} value={minNoteMs} onChange={e => setMinNoteMs(Number(e.target.value))} />
            <small>{t('midi_min_note_hint')}</small>
          </label>

          <div className="mc-go">
            <button type="button" className="btn-primary-pill" disabled={!bpmValid || status === 'working' || !!loadStage} onClick={analyze}>
              <Wand2 size={16} /> {status === 'done' ? t('midi_run_again') : t('midi_run')}
            </button>
            {status === 'error' && <p className="mc-error">{error}</p>}
          </div>
        </section>
      )}

      {status === 'done' && (
        <section className="midi-result">
          <div className="mr-head">
            <div className="mr-stats">
              <span><b className="num">{stats.count}</b> {t('midi_notes')}</span>
              {stats.lowest != null && stats.highest != null && (
                <span>{t('midi_range')} <b className="num">{pitchName(stats.lowest)}–{pitchName(stats.highest)}</b></span>
              )}
              <span><b className="num">{stats.lengthBeats / 4}</b> {t('midi_bars')}</span>
              {key && <span title={t('midi_key_hint')}>{t('midi_key')} <b>{key.label}</b>{key.confidence < 0.6 ? '?' : ''}</span>}
              {recalculating && <span className="mr-recalc"><Loader2 size={13} className="spin" /> {t('midi_recalculating')}</span>}
            </div>
            <div className="mr-actions">
              <button type="button" className={`btn-ghost-pill${playing === 'midi' ? ' on' : ''}`} onClick={playMidi} disabled={!notes.length}>
                {playing === 'midi' ? <Pause size={15} /> : <Play size={15} />} {t('midi_listen')}
              </button>
              <button type="button" className="btn-primary-pill" onClick={saveMidi} disabled={!midiBytes}>
                <Download size={15} /> {t('midi_save')}
              </button>
              <div
                className={`mr-drag${dragPath ? '' : ' wait'}`}
                draggable={!!dragPath}
                onDragStart={(e) => {
                  e.preventDefault();
                  if (dragPath) startDrag({ item: [dragPath], icon: 'icon.png' }).catch(err => console.error('startDrag:', err));
                }}
                title={t('midi_drag_hint')}
              >
                <GripVertical size={15} /> {t('midi_drag')}
              </div>
            </div>
          </div>

          {notes.length ? (
            <PianoRoll notes={notes} lengthBeats={stats.lengthBeats} playhead={playhead} />
          ) : (
            <div className="mr-empty">{t('midi_no_notes')}</div>
          )}
          <p className="mr-tip">{t('midi_tip')}</p>
        </section>
      )}

      {status === 'working' && (
        <AnalyzeOverlay kind="analyze" fileName={fileBase} stage={stage} progress={progress} etaSec={etaSec} onCancel={cancelAnalysis} />
      )}
      {loadStage && (
        <AnalyzeOverlay kind="load" fileName={fileBase} stage={loadStage} progress={loadProgress} etaSec={null} onCancel={cancelLoad} />
      )}
    </div>
  );
};

function MidiHeader() {
  const { t } = useTranslation();
  return <ToolHeader title="MIDI Deconstructor" subtitle={t('midi_subtitle')} badge={t('midi_plan_badge')} />;
}
