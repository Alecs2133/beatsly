import React, { useMemo, useState } from 'react';
import { Check, Loader2, Pause, Play, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../hooks/useTranslation';
import { previewObjectName } from '../../lib/audioPreview';
import { camelotCode, shortKey } from '../../lib/keyColor';
import { errorMessage } from '../../lib/errors';
import type { SoundItem } from '../../types/sound';
import './ModerationQueue.css';

interface ModerationQueueProps {
  sounds: SoundItem[];
  /** Sunetele aprobate sau respinse ies din coadă. */
  onDone: (ids: string[]) => void;
}

/** Calea obiectului în bucket-ul `sounds` — din coloană sau, pentru rânduri vechi, din URL-ul public. */
export function soundStoragePath(sound: Pick<SoundItem, 'storage_path' | 'file_url'>): string | undefined {
  return (
    sound.storage_path ??
    (sound.file_url?.includes('/object/public/sounds/') ? sound.file_url.split('/object/public/sounds/')[1] : undefined)
  );
}

/**
 * Un URL care chiar se poate reda: preview-ul public dacă există, altfel un
 * URL semnat pentru fișierul original. Bucket-ul `sounds` e privat, deci
 * `file_url` (public) nu mai merge — de-asta nu se auzea nimic în moderare.
 * Ultima variantă e chiar `file_url`, pentru rânduri vechi fără cale.
 */
async function playableUrl(sound: SoundItem): Promise<string> {
  if (sound.preview_url) return sound.preview_url;
  const path = soundStoragePath(sound);
  if (path) {
    const { data, error } = await supabase.storage.from('sounds').createSignedUrl(path, 60 * 60);
    if (data) return data.signedUrl;
    if (!sound.file_url) throw error ?? new Error('Nu am putut crea linkul de ascultare.');
  }
  // Rânduri foarte vechi, fără cale în storage: încercăm adresa salvată.
  if (sound.file_url) return sound.file_url;
  throw new Error('Sunetul nu are niciun fișier atașat.');
}

export const ModerationQueue: React.FC<ModerationQueueProps> = ({ sounds, onDone }) => {
  const { t } = useTranslation();
  const { showToast } = useAppStore();
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playTrack = usePlayerStore(s => s.playTrack);
  const togglePlay = usePlayerStore(s => s.togglePlay);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Selecția rămâne doar pe sunetele încă în coadă.
  const visibleSelected = useMemo(() => sounds.filter(s => selected.has(s.id)).map(s => s.id), [sounds, selected]);
  const allSelected = sounds.length > 0 && visibleSelected.length === sounds.length;

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(sounds.map(s => s.id)));

  const play = async (sound: SoundItem) => {
    if (currentTrack?.id === sound.id) {
      togglePlay();
      return;
    }
    setLoadingId(sound.id);
    try {
      const url = await playableUrl(sound);
      playTrack({ ...sound, preview_url: url });
    } catch (err) {
      showToast(`${t('mod_preview_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const approve = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBusy('approve');
    try {
      let approved: number;
      const rpc = await supabase.rpc('approve_sounds', { p_ids: ids });
      if (rpc.error?.code === 'PGRST202') {
        // Migrarea cu `approve_sounds` nu e încă aplicată — mergem pe UPDATE direct.
        const { data, error } = await supabase.from('sounds').update({ status: 'approved' }).in('id', ids).select('id');
        if (error) throw error;
        approved = data?.length ?? 0;
      } else if (rpc.error) {
        throw rpc.error;
      } else {
        approved = rpc.data ?? 0;
      }

      if (approved === 0) throw new Error(t('mod_nothing_approved'));
      showToast(t('mod_approved_n', { count: approved }), 'success');
      onDone(ids);
      setSelected(new Set());
    } catch (err) {
      console.error('Approve failed:', err);
      showToast(`${t('admin_approval_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!window.confirm(t('mod_reject_confirm', { count: ids.length }))) return;
    setBusy('reject');
    const rows = sounds.filter(s => ids.includes(s.id));
    try {
      // Fișierele întâi (originalul + preview-ul), apoi rândurile.
      const paths = rows.map(soundStoragePath).filter((p): p is string => !!p);
      if (paths.length) {
        const { error: e1 } = await supabase.storage.from('sounds').remove(paths);
        if (e1) console.error('Storage delete error:', e1);
        const { error: e2 } = await supabase.storage.from('sound-previews').remove(paths.map(previewObjectName));
        if (e2) console.error('Preview delete error:', e2);
      }
      const { error } = await supabase.from('sounds').delete().in('id', ids);
      if (error) throw error;
      showToast(t('mod_rejected_n', { count: ids.length }), 'info');
      onDone(ids);
      setSelected(new Set());
    } catch (err) {
      console.error('Reject failed:', err);
      showToast(`${t('admin_rejection_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (sounds.length === 0) {
    return <div className="mod-empty">{t('admin_pending_empty')}</div>;
  }

  return (
    <div className="mod">
      <div className="mod-bar">
        <label className="mod-check">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          <span>{visibleSelected.length ? t('mod_selected', { count: visibleSelected.length }) : t('mod_select_all')}</span>
        </label>
        <div className="mod-bar-actions">
          <button
            type="button"
            className="btn-danger-pill"
            disabled={!visibleSelected.length || !!busy}
            onClick={() => reject(visibleSelected)}
          >
            {busy === 'reject' ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
            {t('mod_reject_selected')}
          </button>
          <button
            type="button"
            className="btn-primary-pill"
            disabled={!visibleSelected.length || !!busy}
            onClick={() => approve(visibleSelected)}
          >
            {busy === 'approve' ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
            {t('mod_approve_selected', { count: visibleSelected.length })}
          </button>
        </div>
      </div>

      <ul className="mod-list">
        {sounds.map(sound => {
          const isCurrent = currentTrack?.id === sound.id;
          const code = camelotCode(sound.key);
          return (
            <li key={sound.id} className={`mod-row${selected.has(sound.id) ? ' sel' : ''}`}>
              <input type="checkbox" checked={selected.has(sound.id)} onChange={() => toggle(sound.id)} aria-label={sound.title} />
              <button type="button" className={`mod-play${isCurrent && isPlaying ? ' on' : ''}`} onClick={() => play(sound)} aria-label={sound.title}>
                {loadingId === sound.id ? <Loader2 size={16} className="spin" /> : isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="mod-meta">
                <b>{sound.title}</b>
                <span>{sound.author} · {sound.type}{sound.tags.length ? ` · ${sound.tags.join(', ')}` : ''}</span>
              </div>
              <span className="mod-chip num">{sound.bpm ? `${sound.bpm} BPM` : '—'}</span>
              <span className="mod-chip num">{sound.key ? (code ? `${code} · ${shortKey(sound.key) ?? sound.key}` : sound.key) : '—'}</span>
              <div className="mod-row-actions">
                <button type="button" className="mod-icon danger" disabled={!!busy} onClick={() => reject([sound.id])} title={t('admin_reject_delete')}>
                  <Trash2 size={15} />
                </button>
                <button type="button" className="mod-icon ok" disabled={!!busy} onClick={() => approve([sound.id])} title={t('admin_approve')}>
                  <Check size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
