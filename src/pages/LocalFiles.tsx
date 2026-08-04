import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { SoundGrid } from '../components/SoundGrid';
import { SoundItem } from '../data/mockData';
import { useLocalFilesStore } from '../store/useLocalFilesStore';
import { DropModal } from '../components/DropModal';
import { useTranslation } from '../hooks/useTranslation';

interface LocalSample {
  id: string;
  name: string;
  path: string;
  bpm: string;
  key: string;
  tags: string[];
  duration: string;
}

export const LocalFiles: React.FC = () => {
  const { t } = useTranslation();
  const { sounds, setSounds, selectedFolder, setSelectedFolder, loading, setLoading, error, setError } = useLocalFilesStore();
  const [droppedFile, setDroppedFile] = useState<string | null>(null);

  useEffect(() => {
    // Intercept File Drop over the window (Tauri v2)
    const unlistenPromise = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'drop') {
        const paths = event.payload.paths;
        const audioFile = paths.find((p: string) => p.toLowerCase().endsWith('.wav') || p.toLowerCase().endsWith('.mp3'));
        if (audioFile) {
          setDroppedFile(audioFile);
        }
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Sample Folder'
      });

      if (selected && typeof selected === 'string') {
        setSelectedFolder(selected);
        scanFolder(selected);
      }
    } catch (err: any) {
      console.error(err);
      setError('Eroare la deschiderea dialogului: ' + err.message);
    }
  };

  const scanFolder = async (folderPath: string) => {
    setLoading(true);
    setError(null);
    setSounds([]);
    
    try {
      // Call Rust backend to scan directory
      const localSamples = await invoke<LocalSample[]>('scan_directory', { folderPath });
      
      // Map to SoundItem expected by SoundGrid
      const mappedSounds: SoundItem[] = localSamples.map(sample => ({
        id: `local-${sample.id}`,
        title: sample.name.replace(/\.[^/.]+$/, ""), // remove extension
        author: 'Local File',
        bpm: sample.bpm === '-' ? null : Number(sample.bpm),
        key: sample.key === '-' ? null : sample.key,
        tags: sample.tags,
        duration: sample.duration,
        type: 'loop', // default assumption for local files
        file_url: convertFileSrc(sample.path) // Crucial: Convert local path to asset:// URI
      }));

      setSounds(mappedSounds);
    } catch (err: any) {
      console.error(err);
      setError('Eroare la scanarea folderului: ' + err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="local-files-page" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px' }}>
          Local <span style={{color: 'var(--accent-secondary)'}}>{t('local_explorer')}</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>{t('local_explorer_subtitle')}</p>
        
        <button 
          onClick={handleSelectFolder}
          style={{
            marginTop: '24px',
            background: 'var(--gradient-primary)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          {t('btn_select_folder')}
        </button>
        {selectedFolder && (
          <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
            {t('current_folder')} {selectedFolder}
          </p>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-secondary)' }}>
          <p>{t('scanning_folder')}</p>
        </div>
      )}

      {error && (
        <div style={{ color: '#ff4d4d', padding: '16px', background: 'rgba(255, 77, 77, 0.1)', borderRadius: '8px', marginBottom: '24px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && sounds.length > 0 && (
        <SoundGrid sounds={sounds} />
      )}

      {!loading && !error && selectedFolder && sounds.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <p>{t('no_audio_files')}</p>
        </div>
      )}

      {droppedFile && (
        <DropModal 
          filePath={droppedFile} 
          onClose={() => setDroppedFile(null)} 
        />
      )}
    </div>
  );
};
