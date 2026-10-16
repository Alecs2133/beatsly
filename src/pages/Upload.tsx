import React, { useCallback, useEffect, useState } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { isAdminRole } from '../lib/roles';
import { UploadPanel } from '../components/UploadPanel';
import { Icon } from '../components/Icon';
import './Upload.css';

/** Formatele pe care le putem decoda și pentru preview, și pentru analiză. */
const AUDIO_EXT = ['wav', 'mp3', 'flac', 'ogg'];
const isAudio = (path: string) => AUDIO_EXT.includes(path.split('.').pop()?.toLowerCase() ?? '');

interface MyUpload {
  id: string;
  title: string;
  status: string | null;
  created_at: string;
}

/**
 * Încarcă: tragi fișiere audio oriunde în fereastră, completezi panoul care
 * apare și sunetul pleacă la verificare (sau direct în Descoperă, pentru
 * admini). Dedesubt, ultimele sunete trimise și unde au ajuns.
 */
export const Upload: React.FC = () => {
  const { t } = useTranslation();
  const profile = useAuthStore(s => s.profile);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [mine, setMine] = useState<MyUpload[] | null>(null);

  const enqueue = useCallback((paths: string[]) => {
    const audio = paths.filter(isAudio);
    setRejected(paths.length - audio.length);
    if (!audio.length) return;
    setQueue(prev => {
      const next = [...prev, ...audio.filter(p => !prev.includes(p))];
      setQueueTotal(next.length);
      return next;
    });
  }, []);

  const loadMine = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('sounds')
      .select('id, title, status, created_at')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(12);
    setMine(data ?? []);
  }, [profile]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  // Drag & drop nativ: Tauri primește fișierele trase peste fereastră și ne
  // dă căile lor — fără dialog de căutat prin calculator.
  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent(event => {
      const p = event.payload;
      if (p.type === 'enter' || p.type === 'over') setDragging(true);
      else if (p.type === 'leave') setDragging(false);
      else if (p.type === 'drop') {
        setDragging(false);
        enqueue(p.paths);
      }
    });
    return () => { unlisten.then(fn => fn()); };
  }, [enqueue]);

  const pick = async () => {
    const selected = await open({
      multiple: true,
      directory: false,
      filters: [{ name: 'Audio', extensions: AUDIO_EXT }],
    });
    if (!selected) return;
    enqueue(Array.isArray(selected) ? selected : [selected]);
  };

  const next = (published: boolean) => {
    setQueue(prev => {
      const rest = prev.slice(1);
      if (!rest.length) setQueueTotal(0);
      return rest;
    });
    if (published) loadMine();
  };

  const isAdmin = isAdminRole(profile?.role);
  const current = queue[0];

  return (
    <div className="upload-page">
      <div className="upload-head">
        <h1>{t('upload_title')}</h1>
        <p>{isAdmin ? t('upload_subtitle_admin') : t('upload_subtitle')}</p>
      </div>

      <div className={`dropzone${dragging ? ' over' : ''}`}>
        <div className="dz-bars" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}
        </div>
        <Icon name="upload" size={34} play={dragging ? true : undefined} />
        <h2>{dragging ? t('upload_drop_now') : t('upload_drop_here')}</h2>
        <p>{t('upload_formats')}</p>
        <button type="button" className="btn-ghost-pill" onClick={pick}>
          <FolderOpen size={15} /> {t('upload_pick')}
        </button>
        {rejected > 0 && <p className="dz-warn">{t('upload_rejected', { count: rejected })}</p>}
      </div>

      <section className="my-uploads">
        <h2>{t('upload_mine')}</h2>
        {mine === null ? (
          <div className="skeleton-row" />
        ) : mine.length === 0 ? (
          <p className="muted">{t('upload_mine_empty')}</p>
        ) : (
          <ul>
            {mine.map(s => (
              <li key={s.id}>
                <b>{s.title}</b>
                <time dateTime={s.created_at}>{new Date(s.created_at).toLocaleDateString()}</time>
                <span className={`up-status ${s.status === 'approved' ? 'ok' : 'wait'}`}>
                  {s.status === 'approved' ? t('upload_status_live') : t('upload_status_review')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {current && (
        <UploadPanel
          key={current}
          filePath={current}
          position={{ index: queueTotal - queue.length, total: queueTotal }}
          onDone={next}
          onSkip={() => next(false)}
        />
      )}
    </div>
  );
};
