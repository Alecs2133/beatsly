import React, { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { useAuthStore } from '../store/useAuthStore';

interface StagedFile {
  id: string;
  path: string;
  name: string;
  title: string;
  author: string;
  type: 'loop' | 'one-shot' | 'fx';
  bpm: string;
  key: string;
  tags: string;
  duration: string;
  selected: boolean;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

export const BatchUpload: React.FC = () => {
  const { showToast } = useAppStore();
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const getAudioDuration = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        resolve(formatDuration(audio.duration));
      };
      audio.onerror = () => {
        resolve('0:00');
      };
    });
  };

  const handleSelectFiles = async () => {
    if (!profile?.username) {
      showToast('Please set your Username in Account Settings first!', 'error');
      return;
    }
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Audio', extensions: ['wav', 'mp3'] }]
      });

      if (!selected || !Array.isArray(selected) || selected.length === 0) return;

      setIsLoading(true);
      
      const newFiles: StagedFile[] = [];
      
      for (const path of selected) {
        const url = convertFileSrc(path);
        const duration = await getAudioDuration(url);
        
        // Extract a default title from the file path
        const fileName = path.split('\\').pop()?.split('/').pop() || 'Unknown';
        const defaultTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');

        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          path,
          name: fileName,
          title: defaultTitle,
          author: profile?.username || 'Unknown',
          type: 'loop',
          bpm: '',
          key: '',
          tags: 'trap, hip-hop',
          duration,
          selected: true,
          status: 'pending'
        });
      }

      setFiles(prev => [...prev, ...newFiles]);
    } catch (err: any) {
      console.error(err);
      showToast(t('error_selecting_files'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFile = (id: string, field: keyof StagedFile, value: any) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const toggleSelectAll = (checked: boolean) => {
    setFiles(prev => prev.map(f => ({ ...f, selected: checked })));
  };

  const handlePublish = async () => {
    const toPublish = files.filter(f => f.selected && f.status !== 'success');
    if (toPublish.length === 0) {
      showToast(t('no_files_selected_publish'), 'info');
      return;
    }

    setIsPublishing(true);

    for (const file of toPublish) {
      updateFile(file.id, 'status', 'uploading');
      try {
        const url = convertFileSrc(file.path);
        const response = await fetch(url);
        const blob = await response.blob();

        const safeFileName = `${Date.now()}_${file.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wav`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('sounds')
          .upload(safeFileName, blob);
          
        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('sounds')
          .getPublicUrl(safeFileName);

        // Insert into database
        const numBpm = file.bpm ? parseInt(file.bpm) : null;
        const tagsArray = file.tags.split(',').map(t => t.trim()).filter(t => t !== '');

        const { error: dbError } = await supabase.from('sounds').insert({
          title: file.title,
          author: file.author,
          bpm: numBpm,
          key_signature: file.key,
          tags: tagsArray,
          duration: file.duration,
          type: file.type,
          file_url: publicUrlData.publicUrl,
          status: 'pending'
        });

        if (dbError) throw dbError;

        updateFile(file.id, 'status', 'success');
        updateFile(file.id, 'selected', false);
      } catch (err) {
        console.error('Error publishing file', file.name, err);
        updateFile(file.id, 'status', 'error');
      }
    }

    setIsPublishing(false);
    showToast(t('batch_upload_completed'), 'success');
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>{t('batch_upload_studio') || 'Batch Upload'}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleSelectFiles}
            disabled={isLoading || isPublishing}
            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--accent-primary)', background: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLoading ? t('loading_samples') || 'Loading...' : t('btn_select_files') || 'Select Local Files'}
          </button>
          
          <button 
            onClick={handlePublish}
            disabled={isPublishing || files.filter(f => f.selected).length === 0}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--gradient-primary)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isPublishing ? t('btn_publishing') || 'Publishing...' : t('btn_publish_selected') || 'Publish Selected'}
          </button>
        </div>
      </div>

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

      {files.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
          <p style={{ color: 'var(--text-muted)' }}>{t('no_files_selected')}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '15px' }}>
                  <input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} checked={files.length > 0 && files.every(f => f.selected)} />
                </th>
                <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>{t('file_status')}</th>
                <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>{t('details')}</th>
                <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>{t('music_info')}</th>
                <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>{t('tags_label').replace(' (comma separated)', '')}</th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '15px' }}>
                    <input type="checkbox" checked={f.selected} onChange={e => updateFile(f.id, 'selected', e.target.checked)} />
                  </td>
                  <td style={{ padding: '15px', maxWidth: '200px' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }} title={f.name}>{f.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('duration_label')} {f.duration}</div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: f.status === 'success' ? 'var(--accent-primary)' : f.status === 'error' ? '#ff4444' : f.status === 'uploading' ? 'var(--accent-secondary)' : 'var(--text-muted)' }}>
                      {t('status_label')} {f.status.toUpperCase()}
                    </div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <input type="text" value={f.title} onChange={e => updateFile(f.id, 'title', e.target.value)} placeholder="Title" style={inputStyle} />
                    <input type="text" value={f.author} disabled title="Author is set to your username" style={{...inputStyle, marginTop: '8px', opacity: 0.7, cursor: 'not-allowed'}} />
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select value={f.type} onChange={e => updateFile(f.id, 'type', e.target.value)} style={{...inputStyle, flex: 1}}>
                        <option value="loop">Loop</option>
                        <option value="one-shot">One-Shot</option>
                        <option value="fx">FX</option>
                      </select>
                      <input type="number" value={f.bpm} onChange={e => updateFile(f.id, 'bpm', e.target.value)} placeholder="BPM" style={{...inputStyle, width: '70px'}} />
                      <input type="text" value={f.key} onChange={e => updateFile(f.id, 'key', e.target.value)} placeholder="Key" style={{...inputStyle, width: '60px'}} />
                    </div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <input type="text" value={f.tags} onChange={e => updateFile(f.id, 'tags', e.target.value)} placeholder="Tags (comma sep)" style={inputStyle} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const inputStyle = { padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'white', fontSize: '12px', width: '100%', boxSizing: 'border-box' as const };
