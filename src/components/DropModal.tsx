import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { uploadSoundWithPreview } from '../lib/soundUpload';

interface DropModalProps {
  filePath: string;
  onClose: () => void;
}

export const DropModal: React.FC<DropModalProps> = ({ filePath, onClose }) => {
  const { showToast } = useAppStore();
  const { profile } = useAuthStore();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [author] = useState(profile?.username || '');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [tags, setTags] = useState('');
  const [duration, setDuration] = useState('0:00');
  const [isPublishing, setIsPublishing] = useState(false);
  


  useEffect(() => {
    // Extragere automată a numelui din calea fișierului
    const fileName = filePath.split(/[\\/]/).pop() || '';
    setTitle(fileName.replace(/\.[^/.]+$/, ""));

    let cancelled = false;

    // Fișierele venite prin drag & drop nu trec prin dialog, deci nu sunt
    // adăugate automat în scope-ul `asset:`. Le permitem explicit, altfel
    // `convertFileSrc` produce un URL pe care webview-ul nu-l poate citi.
    (async () => {
      try {
        await invoke('allow_asset_path', { path: filePath });
      } catch (err) {
        console.error('Nu s-a putut permite accesul la fișier:', err);
        return;
      }
      if (cancelled) return;

      const assetUrl = convertFileSrc(filePath);
      const audio = new Audio(assetUrl);

      audio.addEventListener('loadedmetadata', () => {
        if (cancelled) return;
        const minutes = Math.floor(audio.duration / 60);
        const seconds = Math.floor(audio.duration % 60);
        setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      });
    })();

    return () => { cancelled = true; };
  }, [filePath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.username) {
      showToast('Please set your Username in Account Settings first!', 'error');
      return;
    }
    setIsPublishing(true);
    
    try {
      showToast(t('uploading_cloud'), 'info');

      // 1. Fetch local file
      const assetUrl = convertFileSrc(filePath);
      const response = await fetch(assetUrl);
      const blob = await response.blob();

      // 2. Upload fișier complet + preview generat din același blob
      const generatedName = title || 'Untitled';
      const uploaded = await uploadSoundWithPreview(blob, generatedName, profile.id);

      // 3. Insert into Database
      const { error: dbError } = await supabase
        .from('sounds')
        .insert({
          title: generatedName,
          author: author || 'Unknown',
          bpm: bpm ? Number(bpm) : null,
          key_signature: key || null,
          tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
          duration,
          type: 'loop',
          owner_id: profile.id,
          storage_path: uploaded.storagePath,
          preview_url: uploaded.previewUrl,
          file_url: uploaded.legacyPublicUrl,
          status: 'pending'
        });

      if (dbError) throw dbError;

      showToast(t('published_success'), 'success');
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(`${t('publish_failed')} ${err.message}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 99999,
      padding: '40px 20px', overflowY: 'auto'
    }}>
      <div className="glass" style={{
        padding: '30px', borderRadius: '16px', width: '500px',
        maxWidth: '100%', margin: 'auto',
        animation: 'pageFadeIn 0.3s ease-out forwards'
      }}>
        <h2 style={{ marginBottom: '20px', color: 'var(--accent-secondary)' }}>{t('add_dropped_file')}</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', wordBreak: 'break-all' }}>
          {filePath}
        </p>
        
        <div style={{ 
          background: 'rgba(255, 68, 68, 0.1)', 
          border: '1px solid #ff4444', 
          color: '#ff4444', 
          padding: '12px', 
          borderRadius: '8px', 
          fontSize: '13px', 
          marginBottom: '20px',
          lineHeight: '1.4'
        }}>
          {t('publish_warning')}
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>{t('title_label')}</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>{t('author_composers')}</label>
            <input 
              type="text" 
              value={author} 
              disabled
              title="Author is set to your username"
              style={{...inputStyle, opacity: 0.7, cursor: 'not-allowed'}} 
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>BPM</label>
              <input 
                type="number" 
                value={bpm} 
                onChange={e => setBpm(e.target.value)} 
                style={inputStyle} 
                placeholder="Ex: 120"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>Key</label>
              <input 
                type="text" 
                value={key} 
                onChange={e => setKey(e.target.value)} 
                style={inputStyle} 
                placeholder="Ex: C min"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>{t('tags_label')}</label>
            <input 
              type="text" 
              value={tags} 
              onChange={e => setTags(e.target.value)} 
              style={inputStyle} 
              placeholder="trap, piano, loop"
            />
          </div>

          <div style={{ marginTop: '10px', fontSize: '14px', color: 'var(--accent-secondary)' }}>
            <strong>{t('auto_detected_duration')}</strong> {duration}
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)' }}
            >
              {t('btn_cancel')}
            </button>
            <button 
              type="submit"
              disabled={isPublishing}
              style={{ 
                ...btnStyle, 
                background: isPublishing ? 'var(--bg-panel-hover)' : 'var(--gradient-primary)', 
                color: isPublishing ? 'var(--text-muted)' : 'white',
                cursor: isPublishing ? 'not-allowed' : 'pointer'
              }}
            >
              {isPublishing ? t('btn_publishing') : t('btn_publish')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid var(--border-strong)',
  background: 'rgba(0,0,0,0.5)',
  color: 'white',
  outline: 'none'
};

const btnStyle = {
  flex: 1,
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: '0.3s'
};
