import React, { useState } from 'react';
import { SoundGrid } from '../components/SoundGrid';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';

export const MySounds: React.FC = () => {
  const { savedSounds } = useLibraryStore();
  const { searchQuery } = useAppStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('ALL');

  const categories = ['ALL', 'Loop', 'One-Shot', 'FX'];

  const filteredSounds = savedSounds.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = activeFilter === 'ALL' || s.type.toLowerCase() === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="library-page">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>{t('my_sounds_title')}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{t('my_sounds_subtitle')}</p>
      </div>

      <div className="filter-container">
        {categories.map(cat => (
          <button 
            key={cat}
            className={`filter-btn ${activeFilter === cat ? 'active' : ''}`}
            onClick={() => setActiveFilter(cat)}
          >
            {cat === 'ALL' ? t('filter_all') : cat}
          </button>
        ))}
      </div>
      
      {filteredSounds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎧</div>
          <h2 style={{ color: 'white', marginBottom: '12px' }}>{t('no_saved_sounds')}</h2>
          <button 
            onClick={() => navigate('/')}
            style={{
              background: 'var(--gradient-primary)',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '16px'
            }}
          >
            {t('explore_discover')}
          </button>
        </div>
      ) : (
        <SoundGrid sounds={filteredSounds} />
      )}
    </div>
  );
};
