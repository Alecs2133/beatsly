import React, { useState, useEffect, useCallback } from 'react';
import { SoundItem } from '../data/mockData';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { EditSoundModal } from './EditSoundModal';
import { PublishLocalModal } from './PublishLocalModal';
import { useTranslation } from '../hooks/useTranslation';
import { requestDownloadUrl, InsufficientCreditsError } from '../lib/soundUpload';
import { previewObjectName } from '../lib/audioPreview';
import { isAdminRole, isPublisherRole } from '../lib/roles';
import { Play, Pause, Heart, Download, Share2, CloudUpload, Pencil, Trash2, Wand2, Loader2 } from 'lucide-react';
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import { invoke } from '@tauri-apps/api/core';
import './SoundGrid.css';

const SoundRow = React.memo(({
  sound, isCurrentTrack, isPlaying, isSaved, canPublish, canModerate, isAnalyzing, t,
  onPlay, onLike, onDownload, onShare, onPublish, onEdit, onDelete, onAnalyze
}: any) => {
  // Drag nativ către alte aplicații (un DAW) e posibil doar pentru fișiere
  // deja pe disc — sunetele din cloud nu au o cale locală de oferit
  // sistemului de operare. `startDrag` are nevoie de calea brută, nu de
  // `file_url` (care pentru fișierele locale e deja convertit în asset://).
  const isDraggable = sound.id.toString().startsWith('local-') && !!sound.local_path;

  return (
    <div
      className={`grid-row${isDraggable ? ' draggable-row' : ''}`}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) return;
        // Interceptăm drag-ul HTML5 și pornim unul nativ prin Tauri, ca
        // fișierul să poată fi plasat direct într-un DAW extern.
        e.preventDefault();
        startDrag({ item: [sound.local_path], icon: 'icon.png' });
      }}
      title={isDraggable ? 'Drag into your DAW' : undefined}
    >
      <div className="col col-play">
        <button 
          className="row-play-btn"
          onClick={() => onPlay(sound)}
          style={{
            color: isCurrentTrack ? 'var(--accent-primary)' : 'inherit'
          }}
        >
          {isCurrentTrack && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
      </div>
      <div className="col col-title">
        <div className="sound-title">{sound.title}</div>
        <div className="sound-author">{sound.author}</div>
      </div>
      <div className="col col-bpm">{sound.bpm || '-'}</div>
      <div className="col col-key">{sound.key || '-'}</div>
      <div className="col col-tags">
        {sound.tags.map((tag: string) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <div className="col col-actions">
        <button 
          className="row-action-btn"
          onClick={() => onLike(sound)}
          style={{
            color: isSaved ? 'var(--accent-tertiary)' : 'inherit'
          }}
        >
          <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} color={isSaved ? 'var(--accent-tertiary)' : 'currentColor'} />
        </button>
        <button className="row-action-btn download" onClick={() => onDownload(sound)} title={t('download')}><Download size={18} /></button>
        <button className="row-action-btn" onClick={() => onShare(sound)} title="Share"><Share2 size={18} /></button>
        {sound.id.toString().startsWith('local-') && !!sound.local_path && (
          <button
            className="row-action-btn"
            onClick={() => onAnalyze(sound)}
            disabled={isAnalyzing}
            title="Detect real BPM & key from the audio"
          >
            {isAnalyzing ? <Loader2 size={18} className="spin" /> : <Wand2 size={18} />}
          </button>
        )}
        {sound.id.toString().startsWith('local-') && canPublish && (
          <button className="row-action-btn" onClick={() => onPublish(sound)} title="Publish to Cloud"><CloudUpload size={18} /></button>
        )}
        {!sound.id.toString().startsWith('local-') && canModerate && (
          <>
            <button className="row-action-btn" onClick={() => onEdit(sound)} title="Edit Sound"><Pencil size={18} /></button>
            <button className="row-action-btn" onClick={() => onDelete(sound)} title="Delete Sound" style={{ color: '#ff4444' }}><Trash2 size={18} /></button>
          </>
        )}
      </div>
    </div>
  );
});

interface SoundGridProps {
  sounds: SoundItem[];
  /**
   * Apelat după o analiză audio reușită (sau o editare), ca pagina părinte
   * să poată persista corecția în propriul store — necesar în special pentru
   * fișierele locale, care nu au nicio persistență server-side; fără asta,
   * corecția s-ar pierde la următoarea navigare, fiindcă `sounds` intern se
   * resincronizează din prop-ul `sounds` primit de la părinte.
   */
  onSoundUpdated?: (id: string | number, updates: Partial<SoundItem>) => void;
}

interface AudioAnalysis {
  bpm: number;
  key: string;
  bpm_confidence: number;
  key_confidence: number;
}

export const SoundGrid: React.FC<SoundGridProps> = ({ sounds: initialSounds, onSoundUpdated }) => {
  const [sounds, setSounds] = useState<SoundItem[]>(initialSounds);
  const [editingSound, setEditingSound] = useState<SoundItem | null>(null);
  const [publishingSound, setPublishingSound] = useState<SoundItem | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | number | null>(null);

  useEffect(() => {
    setSounds(initialSounds);
  }, [initialSounds]);

  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const playQueue = usePlayerStore(state => state.playQueue);
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.next);
  const prevTrack = usePlayerStore(state => state.prev);

  // Deleagă la coada reală a player-ului, în loc să caute local în `sounds`.
  // Varianta veche funcționa doar dacă piesa curentă era în lista AFIȘATĂ ÎN
  // ACEASTĂ grilă — dacă porneai redarea din Discover și navigai la My
  // Sounds fără să oprești, săgețile nu mai găseau piesa (index -1) și nu
  // făceau nimic. Coada reală urmărește ce redă efectiv player-ul, nu ce
  // pagină se întâmplă să fie deschisă.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!currentTrack) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        prevTrack();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextTrack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, nextTrack, prevTrack]);

  // Click pe play: dacă e deja piesa activă, doar pauză/reluare (nu strică
  // nicio coadă existentă). Altfel, coada devine lista curent afișată în
  // grilă, pornind de la sunetul apăsat — așa alimentăm next/prev cu context
  // real, nu doar redăm un singur sunet izolat.
  const handlePlay = useCallback((sound: SoundItem) => {
    if (currentTrack?.id === sound.id) {
      togglePlay();
      return;
    }
    const index = sounds.findIndex(s => s.id === sound.id);
    playQueue(sounds, index === -1 ? 0 : index);
  }, [sounds, currentTrack, togglePlay, playQueue]);

  const savedSounds = useLibraryStore(state => state.savedSounds);
  const toggleSaveSound = useLibraryStore(state => state.toggleSaveSound);
  const showToast = useAppStore(state => state.showToast);
  const session = useAuthStore(state => state.session);
  const { t } = useTranslation();
  
  const profile = useAuthStore(state => state.profile);
  const role = profile?.role;
  const canPublish = isPublisherRole(role);
  const isModerator = isAdminRole(role);

  // Editarea/ștergerea aparțin fie moderatorilor, fie proprietarului
  // sunetului. Regula reală e în RLS; asta doar ascunde butoanele.
  const canManage = useCallback(
    (sound: SoundItem) =>
      isModerator || (!!profile?.id && sound.owner_id === profile.id),
    [isModerator, profile?.id]
  );

  const handleDelete = useCallback(async (sound: SoundItem) => {
    if (!window.confirm('Are you sure you want to delete this sound forever?')) return;
    try {
      showToast('Deleting...', 'info');

      // Fișierele se șterg ÎNAINTEA rândului. Anterior se ștergea doar rândul,
      // iar fișierul rămânea în storage la nesfârșit — invizibil în aplicație,
      // dar consumând spațiu. Așa au apărut obiectele orfane din bucket.
      const storagePath =
        sound.storage_path ??
        (sound.file_url?.includes('/object/public/sounds/')
          ? sound.file_url.split('/object/public/sounds/')[1]
          : undefined);

      if (storagePath) {
        const { error: fileError } = await supabase.storage
          .from('sounds')
          .remove([storagePath]);
        if (fileError) console.error('Storage delete error:', fileError);

        const { error: previewError } = await supabase.storage
          .from('sound-previews')
          .remove([previewObjectName(storagePath)]);
        if (previewError) console.error('Preview delete error:', previewError);
      }

      const { error } = await supabase.from('sounds').delete().eq('id', sound.id);
      if (error) throw error;

      setSounds(prev => prev.filter(s => s.id !== sound.id));
      showToast('Sound deleted permanently.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Delete failed: ' + err.message, 'error');
    }
  }, [showToast]);

  const handleEditSuccess = useCallback((soundId: string | number, updated: Partial<SoundItem>) => {
    setSounds(prev => prev.map(s => s.id === soundId ? { ...s, ...updated } as SoundItem : s));
    onSoundUpdated?.(soundId, updated);
  }, [onSoundUpdated]);

  const handleAnalyze = useCallback(async (sound: SoundItem) => {
    if (!sound.local_path) return;
    setAnalyzingId(sound.id);
    try {
      const result = await invoke<AudioAnalysis>('analyze_sample_audio', { path: sound.local_path });
      const bpm = Math.round(result.bpm);
      const updates: Partial<SoundItem> = { bpm, key: result.key };

      setSounds(prev => prev.map(s => s.id === sound.id ? { ...s, ...updates } : s));
      onSoundUpdated?.(sound.id, updates);

      // Biblioteca de analiză își raportează singură cât de sigură e —
      // sub 0.3 chiar ea consideră rezultatul nesigur (fișiere fără
      // tonalitate clară: percuție pură, zgomot, FX). Un rezultat afișat
      // fără această avertizare ar părea la fel de sigur ca unul cert.
      if (result.key_confidence < 0.3) {
        showToast(`Detected ${bpm} BPM. Key confidence is low (${result.key} may be inaccurate) — verify manually.`, 'info');
      } else {
        showToast(`Detected ${bpm} BPM, key ${result.key}`, 'success');
      }
    } catch (err: any) {
      console.error('analyze_sample_audio failed:', err);
      showToast('Analysis failed: ' + (err?.message ?? String(err)), 'error');
    } finally {
      setAnalyzingId(null);
    }
  }, [showToast, onSoundUpdated]);

  const handleLike = useCallback((sound: SoundItem) => {
    toggleSaveSound(sound);
  }, [toggleSaveSound]);

  const handleDownload = useCallback(async (sound: SoundItem) => {
    const isLocal = sound.id.toString().startsWith('local-');

    if (!isLocal && !session) {
      showToast(t('logged_in_download'), 'error');
      return;
    }

    try {
      const filePath = await save({
        defaultPath: `${sound.title.replace(/\s+/g, '_')}.wav`,
        filters: [{ name: 'Audio', extensions: ['wav'] }]
      });

      if (!filePath) {
        showToast(t('download_cancelled'), 'info');
        return;
      }

      showToast(t('preparing_download'), 'info');

      // Pentru sunetele din cloud, URL-ul vine de la server, care consumă
      // creditul în aceeași cerere. Fișierul complet stă în bucket privat,
      // deci nu există cale de a-l lua ocolind plata. Creditul se ia abia
      // aici, după ce userul a ales destinația.
      const sourceUrl = isLocal
        ? (sound.file_url ?? '')
        : await requestDownloadUrl(sound.id.toString());

      const response = await tauriFetch(sourceUrl);
      const buffer = await response.arrayBuffer();

      await writeFile(filePath, new Uint8Array(buffer));

      showToast(t('download_complete'), 'success');
    } catch (error) {
      console.error('[download]', error);
      if (error instanceof InsufficientCreditsError) {
        showToast(t('not_enough_credits'), 'error');
      } else {
        // Mesajul brut, nu doar eticheta generică: fără el orice esec arata
        // la fel, iar cauza reala ramane doar in consola.
        const detail = error instanceof Error ? error.message : String(error);
        showToast(`${t('download_failed')}: ${detail}`, 'error');
      }
    }
  }, [session, showToast, t]);

  const handleShare = useCallback((sound: SoundItem) => {
    navigator.clipboard.writeText(`${sound.title} by ${sound.author}`);
    showToast('Copied to clipboard!', 'success');
  }, [showToast]);

  const handlePublishClick = useCallback((sound: SoundItem) => {
    setPublishingSound(sound);
  }, []);

  return (
    <div className="sound-grid">
      <div className="grid-header">
        <div className="col col-play"></div>
        <div className="col col-title">Title</div>
        <div className="col col-bpm">BPM</div>
        <div className="col col-key">Key</div>
        <div className="col col-tags">Tags</div>
        <div className="col col-actions"></div>
      </div>
      
      <div className="grid-body">
        {sounds.map(sound => {
          const isSaved = savedSounds.some(s => s.id === sound.id);
          const isCurrentTrack = currentTrack?.id === sound.id;
          return (
            <SoundRow 
              key={sound.id}
              sound={sound}
              isCurrentTrack={isCurrentTrack}
              isPlaying={isPlaying}
              isSaved={isSaved}
              canPublish={canPublish}
              canModerate={canManage(sound)}
              isAnalyzing={analyzingId === sound.id}
              t={t}
              onPlay={handlePlay}
              onLike={handleLike}
              onDownload={handleDownload}
              onShare={handleShare}
              onPublish={handlePublishClick}
              onEdit={setEditingSound}
              onDelete={handleDelete}
              onAnalyze={handleAnalyze}
            />
          );
        })}
      </div>

      {editingSound && (
        <EditSoundModal 
          sound={editingSound} 
          onClose={() => setEditingSound(null)}
          onSuccess={(updated) => handleEditSuccess(editingSound.id, updated)}
        />
      )}

      {publishingSound && (
        <PublishLocalModal 
          sound={publishingSound} 
          onClose={() => setPublishingSound(null)}
          onSuccess={() => {
            // Optional: you can mark it as published or refresh if needed.
          }}
        />
      )}
    </div>
  );
};
