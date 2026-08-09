import React, { useState } from 'react';
import { generateAudio } from '../lib/hfApi';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
export const Analyzer: React.FC = () => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [bpm, setBpm] = useState<number | ''>('');
  const [musicalKey, setMusicalKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { toggleSaveSound, isSaved } = useLibraryStore();
  const { credits, setCredits, showToast } = useAppStore();
  
  // A unique ID for the generated sound to keep track in My Sounds
  const [currentGeneratedId, setCurrentGeneratedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (credits < 1) {
      setError(t('out_of_credits'));
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    
    try {
      const finalPrompt = `${prompt}${bpm ? `, ${bpm} BPM` : ''}${musicalKey ? `, Key of ${musicalKey}` : ''}`;
      const url = await generateAudio(finalPrompt);
      setAudioUrl(url);
      setCredits(prev => prev - 1);
      setCurrentGeneratedId(Date.now().toString());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="analyzer-page" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px' }}>AI <span style={{color: 'var(--accent-secondary)'}}>Generator</span></h1>
        <p style={{ color: 'var(--text-muted)' }}>{t('ai_generator_subtitle')}</p>
      </div>

      <div className="generator-card glass" style={{ padding: '32px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', overflow: 'hidden' }}>
        
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(64px)',
          WebkitBackdropFilter: 'blur(64px)',
          zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center', borderRadius: '12px'
        }}>
          <div style={{
            background: 'var(--gradient-primary)', padding: '8px 24px', borderRadius: '100px',
            fontSize: '14px', fontWeight: 'bold', color: 'white', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px',
            boxShadow: '0 4px 15px rgba(255, 51, 102, 0.4)'
          }}>
            Coming Soon
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
            Advanced AI Generation
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.5' }}>
            Lucrăm la integrarea celui mai performant model AI pentru a-ți permite să generezi instrumentale la calitate de studio direct din text. Revino curând!
          </p>
        </div>
        <div className="input-group">
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--accent-primary)' }}>{t('prompt_label')}</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('prompt_placeholder')}
            style={{ 
              width: '100%', 
              height: '120px', 
              background: 'rgba(0,0,0,0.3)', 
              border: '1px solid var(--border-strong)', 
              borderRadius: '8px', 
              padding: '16px',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="input-group" style={{ flex: 1 }}>
             <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>{t('bpm_label')}</label>
             <input 
               type="number" 
               placeholder="120"
               value={bpm} 
               onChange={(e) => setBpm(e.target.value ? Number(e.target.value) : '')}
               style={{ 
                 width: '100%', 
                 padding: '12px 16px',
                 background: 'rgba(0,0,0,0.3)', 
                 border: '1px solid var(--border-strong)', 
                 borderRadius: '8px',
                 color: 'var(--text-main)'
               }}
             />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
             <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>{t('key_label')}</label>
             <input 
               type="text" 
               placeholder="Am, Cmaj"
               value={musicalKey} 
               onChange={(e) => setMusicalKey(e.target.value)}
               style={{ 
                 width: '100%', 
                 padding: '12px 16px',
                 background: 'rgba(0,0,0,0.3)', 
                 border: '1px solid var(--border-strong)', 
                 borderRadius: '8px',
                 color: 'var(--text-main)'
               }}
             />
          </div>
        </div>

        {error && (
          <div style={{ color: '#ff4d4d', padding: '16px', background: 'rgba(255, 77, 77, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <button 
          onClick={handleGenerate} 
          disabled={isGenerating || !prompt.trim()}
          style={{
            background: isGenerating ? 'var(--bg-panel-hover)' : 'var(--gradient-primary)',
            color: 'white',
            border: 'none',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            opacity: (!prompt.trim() && !isGenerating) ? 0.5 : 1
          }}
        >
          {isGenerating ? t('btn_generating') : t('btn_generate')}
        </button>

        {audioUrl && (
          <div className="result-section" style={{ marginTop: '24px', padding: '24px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid var(--accent-secondary)' }}>
             <h3 style={{ marginBottom: '16px', color: 'var(--accent-secondary)' }}>{t('generated_result')}</h3>
             <audio controls src={audioUrl} style={{ width: '100%', marginBottom: '16px' }}></audio>
             
             <button
               onClick={() => {
                 if (currentGeneratedId) {
                   toggleSaveSound({
                     id: currentGeneratedId,
                     title: prompt.substring(0, 30) + '...',
                     author: 'AI Generated',
                     bpm: bpm ? Number(bpm) : 120,
                     key: musicalKey || 'Unknown',
                     tags: ['ai', 'generated'],
                     duration: '0:15',
                     type: 'loop',
                     file_url: audioUrl
                   });
                   showToast(isSaved(currentGeneratedId) ? t('removed_from_sounds') : t('saved_to_sounds'), 'success');
                 }
               }}
               style={{
                 background: 'transparent',
                 color: currentGeneratedId && isSaved(currentGeneratedId) ? 'var(--accent-tertiary)' : 'var(--text-main)',
                 border: '1px solid var(--border-strong)',
                 padding: '8px 16px',
                 borderRadius: '20px',
                 cursor: 'pointer',
                 transition: 'all 0.2s',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '8px'
               }}
             >
               {currentGeneratedId && isSaved(currentGeneratedId) ? t('btn_saved') : t('btn_save_my_sounds')}
             </button>
          </div>
        )}

      </div>
    </div>
  );
};