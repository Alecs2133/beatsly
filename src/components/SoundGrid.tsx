import React, { useState, useEffect, useCallback } from 'react';
import { SoundItem } from '../data/mockData';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { EditSoundModal } from './EditSoundModal';
import { PublishLocalModal } from './PublishLocalModal';
import { useTranslation } from '../hooks/useTranslation';
import { Play, Pause, Heart, Download, Share2, CloudUpload, Pencil, Trash2 } from 'lucide-react';
import './SoundGrid.css';

const SoundRow = React.memo(({ 
  sound, isCurrentTrack, isPlaying, isSaved, canPublish, isOwner, t,
  onPlay, onLike, onDownload, onShare, onPublish, onEdit, onDelete 
}: any) => {
  return (
    <div className="grid-row">
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
        {sound.id.toString().startsWith('local-') && canPublish && (
          <button className="row-action-btn" onClick={() => onPublish(sound)} title="Publish to Cloud"><CloudUpload size={18} /></button>
        )}
        {!sound.id.toString().startsWith('local-') && isOwner && (
          <>
            <button className="row-action-btn" onClick={() => onEdit(sound)} title="Edit Sound"><Pencil size={18} /></button>
            <button className="row-action-btn" onClick={() => onDelete(sound.id)} title="Delete Sound" style={{ color: '#ff4444' }}><Trash2 size={18} /></button>
          </>
        )}
      </div>
    </div>
  );
});

interface SoundGridProps {
  sounds: SoundItem[];
}

export const SoundGrid: React.FC<SoundGridProps> = ({ sounds: initialSounds }) => {
  const [sounds, setSounds] = useState<SoundItem[]>(initialSounds);
  const [editingSound, setEditingSound] = useState<SoundItem | null>(null);
  const [publishingSound, setPublishingSound] = useState<SoundItem | null>(null);

  useEffect(() => {
    setSounds(initialSounds);
  }, [initialSounds]);

  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const playTrack = usePlayerStore(state => state.playTrack);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (!currentTrack) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const index = sounds.findIndex(s => s.id === currentTrack.id);
        
        if (index !== -1) {
          if (e.key === 'ArrowUp' && index > 0) {
            playTrack(sounds[index - 1]);
          } else if (e.key === 'ArrowDown' && index < sounds.length - 1) {
            playTrack(sounds[index + 1]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, sounds, playTrack]);

  const savedSounds = useLibraryStore(state => state.savedSounds);
  const toggleSaveSound = useLibraryStore(state => state.toggleSaveSound);
  const showToast = useAppStore(state => state.showToast);
  const session = useAuthStore(state => state.session);
  const deductCredit = useAuthStore(state => state.deductCredit);
  const { t } = useTranslation();
  
  const role = session?.user?.user_metadata?.role;
  const canPublish = role === 'PRODUCER' || role === 'VIDEO MAKER' || role === 'PRODUCER ADMIN' || role === 'OWNER';
  const isOwner = role === 'OWNER';

  const handleDelete = useCallback(async (soundId: string | number) => {
    if (!window.confirm('Are you sure you want to delete this sound forever?')) return;
    try {
      showToast('Deleting...', 'info');
      const { error } = await supabase.from('sounds').delete().eq('id', soundId);
      if (error) throw error;
      setSounds(prev => prev.filter(s => s.id !== soundId));
      showToast('Sound deleted permanently.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Delete failed: ' + err.message, 'error');
    }
  }, [showToast]);

  const handleEditSuccess = useCallback((soundId: string | number, updated: Partial<SoundItem>) => {
    setSounds(prev => prev.map(s => s.id === soundId ? { ...s, ...updated } as SoundItem : s));
  }, []);

  const handleLike = useCallback((sound: SoundItem) => {
    toggleSaveSound(sound);
  }, [toggleSaveSound]);

  const handleDownload = useCallback(async (sound: SoundItem) => {
    if (!sound.id.toString().startsWith('local-')) {
      if (!session) {
        showToast(t('logged_in_download'), 'error');
        return;
      }
      
      const success = await deductCredit();
      if (!success) {
        showToast(t('not_enough_credits'), 'error');
        return;
      }
    }

    try {
      showToast(t('preparing_download'), 'info');
      const filePath = await save({
        defaultPath: `${sound.title.replace(/\s+/g, '_')}.wav`,
        filters: [{ name: 'Audio', extensions: ['wav'] }]
      });

      if (!filePath) {
        showToast('Download cancelled', 'info');
        return;
      }

      const response = await fetch(sound.file_url || '/test_beat.wav');
      const buffer = await response.arrayBuffer();
      
      await writeFile(filePath, new Uint8Array(buffer));
      
      showToast('Download complete!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Download failed', 'error');
    }
  }, [session, deductCredit, showToast, t]);

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
              isOwner={isOwner}
              t={t}
              onPlay={playTrack}
              onLike={handleLike}
              onDownload={handleDownload}
              onShare={handleShare}
              onPublish={handlePublishClick}
              onEdit={setEditingSound}
              onDelete={handleDelete}
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
