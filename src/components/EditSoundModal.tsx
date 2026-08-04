import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SoundItem } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';

interface EditSoundModalProps {
  sound: SoundItem;
  onClose: () => void;
  onSuccess: (updated: Partial<SoundItem>) => void;
}

export const EditSoundModal: React.FC<EditSoundModalProps> = ({ sound, onClose, onSuccess }) => {
  const { showToast } = useAppStore();
  const { t } = useTranslation();
  const [title, setTitle] = useState(sound.title);
  const [author, setAuthor] = useState(sound.author);
  const [type, setType] = useState<SoundItem['type']>(sound.type);
  const [bpm, setBpm] = useState(sound.bpm?.toString() || '');
  const [keySignature, setKeySignature] = useState(sound.key || '');
  const [tags, setTags] = useState(sound.tags.join(', '));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      showToast(t('saving_changes'), 'info');

      const updatedTags = tags.split(',').map(t => t.trim()).filter(t => t !== '');
      const numBpm = bpm ? parseInt(bpm) : null;

      const { error } = await supabase
        .from('sounds')
        .update({
          title,
          author,
          type,
          bpm: numBpm,
          key_signature: keySignature,
          tags: updatedTags
        })
        .eq('id', sound.id);

      if (error) throw error;

      showToast(t('sound_updated'), 'success');
      onSuccess({ title, author, type, bpm: numBpm || undefined, key: keySignature, tags: updatedTags });
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(`${t('failed_update')} ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
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
        animation: 'pageFadeIn 0.3s ease-out forwards',
        border: '1px solid var(--accent-primary)'
      }}>
        <h2 style={{ marginBottom: '20px', color: 'var(--accent-primary)' }}>{t('edit_sound_owner')}</h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('title_label')}</label>
              <input type="text" style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('author_label')}</label>
              <input type="text" style={inputStyle} value={author} onChange={e => setAuthor(e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('type_label')}</label>
            <select style={inputStyle} value={type} onChange={e => setType(e.target.value as SoundItem['type'])}>
              <option value="loop">loop</option>
              <option value="one-shot">one-shot</option>
              <option value="fx">fx</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>BPM</label>
              <input type="number" style={inputStyle} value={bpm} onChange={e => setBpm(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Key</label>
              <input type="text" style={inputStyle} value={keySignature} onChange={e => setKeySignature(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('tags_label')}</label>
            <input type="text" style={inputStyle} value={tags} onChange={e => setTags(e.target.value)} placeholder={t('tags_placeholder')} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
              {t('btn_cancel')}
            </button>
            <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '12px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>
              {isSaving ? t('saving_changes') : t('btn_save_changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

const labelStyle = { display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'white', fontSize: '14px', boxSizing: 'border-box' as const };
