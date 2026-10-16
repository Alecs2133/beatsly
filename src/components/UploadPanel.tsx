import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { Loader2, Pause, Play, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../hooks/useTranslation';
import { uploadSoundWithPreview } from '../lib/soundUpload';
import { LICENSE_OPTIONS, type SoundLicense } from '../lib/licenses';
import { ALL_KEYS, parseKey, toCamelot } from '../lib/musicKey';
import { isAdminRole } from '../lib/roles';
import { errorMessage } from '../lib/errors';
import { Segmented } from './Segmented';
import { WaveBars } from './WaveBars';
import type { SoundItem } from '../types/sound';
import './UploadPanel.css';

interface AudioAnalysis {
  bpm: number;
  key: string;
  bpm_confidence: number;
  key_confidence: number;
}

type SoundType = SoundItem['type'];

interface UploadPanelProps {
  filePath: string;
  /** „2 din 3” când s-au tras mai multe fișiere deodată. */
  position: { index: number; total: number };
  onDone: (published: boolean) => void;
  onSkip: () => void;
}

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;
const titleFrom = (path: string) =>
  fileName(path)
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Ghicim tipul din nume — producătorii scriu des „loop”, „one shot”, „fx” în fișier. */
function guessType(path: string): SoundType {
  const n = fileName(path).toLowerCase();
  if (/\b(fx|sfx|riser|impact|sweep|downlifter|uplifter)\b/.test(n)) return 'fx';
  if (/one[\s_-]?shot|\b(kick|snare|hat|clap|perc|808)\b/.test(n) && !/loop/.test(n)) return 'one-shot';
  return 'loop';
}

/**
 * Panoul care apare după ce tragi un fișier audio în aplicație: titlu, tip,
 * BPM și tonalitate (detectate automat din fișier), etichete, licență. La
 * trimitere sunetul merge în coada de moderare — sau direct în Descoperă,
 * dacă cel care urcă e admin.
 */
export const UploadPanel: React.FC<UploadPanelProps> = ({ filePath, position, onDone, onSkip }) => {
  const { t } = useTranslation();
  const showToast = useAppStore(s => s.showToast);
  const profile = useAuthStore(s => s.profile);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playTrack = usePlayerStore(s => s.playTrack);

  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [title, setTitle] = useState(() => titleFrom(filePath));
  const [type, setType] = useState<SoundType>(() => guessType(filePath));
  const [bpm, setBpm] = useState('');
  const [keyIdx, setKeyIdx] = useState<number | null>(null);
  const [tags, setTags] = useState('');
  const [license, setLicense] = useState<SoundLicense>('royalty_free');
  const [duration, setDuration] = useState('0:00');
  const [analyzing, setAnalyzing] = useState(true);
  const [detected, setDetected] = useState(false);
  const [sending, setSending] = useState(false);

  const isAdmin = isAdminRole(profile?.role);
  const previewId = `local-upload-${filePath}`;

  // Fișierul tras nu trece prin dialog, deci îl permitem explicit pentru
  // protocolul `asset:`, apoi citim durata și analizăm BPM-ul și tonalitatea.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await invoke('allow_asset_path', { path: filePath });
      } catch (err) {
        console.error('allow_asset_path failed:', err);
      }
      if (cancelled) return;
      const url = convertFileSrc(filePath);
      setAssetUrl(url);

      const probe = new Audio(url);
      probe.addEventListener('loadedmetadata', () => {
        if (cancelled || !Number.isFinite(probe.duration)) return;
        const m = Math.floor(probe.duration / 60);
        const s = Math.floor(probe.duration % 60);
        setDuration(`${m}:${s.toString().padStart(2, '0')}`);
      });

      try {
        const result = await invoke<AudioAnalysis>('analyze_sample_audio', { path: filePath });
        if (cancelled) return;
        // Sub 0.3 analiza însăși consideră rezultatul nesigur — nu completăm.
        if (result.bpm_confidence >= 0.3 && result.bpm > 0) setBpm(String(Math.round(result.bpm)));
        const parsed = result.key_confidence >= 0.3 ? parseKey(result.key) : null;
        if (parsed) {
          const idx = ALL_KEYS.findIndex(k => k.key.root === parsed.root && k.key.mode === parsed.mode);
          if (idx >= 0) setKeyIdx(idx);
        }
        setDetected(true);
      } catch (err) {
        console.warn('Analiza audio a eșuat:', err);
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filePath]);

  const previewTrack = useMemo<SoundItem | null>(
    () =>
      assetUrl
        ? {
            id: previewId,
            title: title || titleFrom(filePath),
            author: profile?.username ?? '',
            bpm: bpm ? Number(bpm) : null,
            key: keyIdx == null ? null : ALL_KEYS[keyIdx].label,
            tags: [],
            duration,
            type,
            file_url: assetUrl,
            local_path: filePath,
          }
        : null,
    [assetUrl, previewId, title, filePath, profile?.username, bpm, keyIdx, duration, type]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.username) {
      showToast(t('set_username_first'), 'error');
      return;
    }
    if (!assetUrl) return;
    setSending(true);
    try {
      const blob = await (await fetch(assetUrl)).blob();
      const finalTitle = title.trim() || titleFrom(filePath);
      const uploaded = await uploadSoundWithPreview(blob, finalTitle, profile.id);
      const { error } = await supabase.from('sounds').insert({
        title: finalTitle,
        author: profile.username,
        bpm: bpm ? Number(bpm) : null,
        key_signature: keyIdx == null ? null : ALL_KEYS[keyIdx].label,
        tags: tags.split(',').map(s => s.trim()).filter(Boolean),
        duration,
        type,
        owner_id: profile.id,
        storage_path: uploaded.storagePath,
        preview_url: uploaded.previewUrl,
        file_url: uploaded.legacyPublicUrl,
        // Adminii publică direct; ceilalți trec prin moderare.
        status: isAdmin ? 'approved' : 'pending',
        license,
      });
      if (error) throw error;
      showToast(isAdmin ? t('upload_published') : t('upload_sent_review'), 'success');
      onDone(true);
    } catch (err) {
      console.error(err);
      showToast(`${t('publish_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const isThisPlaying = currentTrack?.id === previewId && isPlaying;

  return createPortal(
    <div className="up-overlay" onMouseDown={e => e.target === e.currentTarget && !sending && onSkip()}>
      <form className="up-panel" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="up-title">
        <header className="up-head">
          <div>
            <h2 id="up-title">{t('upload_panel_title')}</h2>
            <p>
              {fileName(filePath)} · <span className="num">{duration}</span>
              {position.total > 1 && <> · {t('upload_position', { index: position.index + 1, total: position.total })}</>}
            </p>
          </div>
          <button type="button" className="up-close" onClick={onSkip} disabled={sending} aria-label={t('btn_cancel')}>
            <X size={18} />
          </button>
        </header>

        <div className="up-player">
          <button
            type="button"
            className={`up-play${isThisPlaying ? ' on' : ''}`}
            onClick={() => previewTrack && playTrack(previewTrack)}
            disabled={!previewTrack}
            aria-label={t('upload_listen')}
          >
            {isThisPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="up-wave">
            {assetUrl && <WaveBars url={assetUrl} active={currentTrack?.id === previewId} bars={64} />}
          </div>
        </div>

        <label className="up-field">
          <span>{t('title_label')}</span>
          <input className="up-input" value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} autoFocus />
        </label>

        <div className="up-field">
          <span>{t('rack_type')}</span>
          <Segmented
            ariaLabel={t('rack_type')}
            value={type}
            onChange={v => setType(v as SoundType)}
            options={[
              { value: 'loop', label: 'Loop' },
              { value: 'one-shot', label: 'One-Shot' },
              { value: 'fx', label: 'FX' },
            ]}
          />
        </div>

        <div className="up-row">
          <label className="up-field">
            <span>BPM</span>
            <input
              className="up-input num"
              value={bpm}
              inputMode="numeric"
              maxLength={3}
              placeholder={analyzing ? '…' : '—'}
              onChange={e => setBpm(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="up-field">
            <span>{t('grid_key')}</span>
            <select
              className="up-input"
              value={keyIdx ?? ''}
              onChange={e => setKeyIdx(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">{analyzing ? '…' : '—'}</option>
              {ALL_KEYS.map((k, i) => (
                <option key={i} value={i}>{`${toCamelot(k.key)} · ${k.label}`}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="up-detect">
          {analyzing ? (
            <><Loader2 size={13} className="spin" /> {t('upload_analyzing')}</>
          ) : detected ? (
            <><Sparkles size={13} /> {t('upload_detected')}</>
          ) : (
            t('upload_detect_failed')
          )}
        </p>

        <label className="up-field">
          <span>{t('tags_label')}</span>
          <input className="up-input" value={tags} onChange={e => setTags(e.target.value)} placeholder={t('tags_placeholder')} />
        </label>

        <label className="up-field">
          <span>{t('license_label')}</span>
          <select className="up-input" value={license} onChange={e => setLicense(e.target.value as SoundLicense)}>
            {LICENSE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <p className="up-note">{isAdmin ? t('upload_admin_note') : t('upload_review_note')}</p>

        <footer className="up-foot">
          <button type="button" className="btn-ghost-pill" onClick={onSkip} disabled={sending}>
            {position.total > 1 ? t('upload_skip') : t('btn_cancel')}
          </button>
          <button type="submit" className="btn-primary-pill" disabled={sending || !assetUrl}>
            {sending && <Loader2 size={15} className="spin" />}
            {sending ? t('btn_publishing') : isAdmin ? t('upload_publish_now') : t('upload_send_review')}
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
};
