import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export const ComingSoon: React.FC<{ feature: string }> = ({ feature }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="glass" style={{ maxWidth: 520, margin: '60px auto', padding: '48px 32px', borderRadius: 16, textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, margin: '0 auto 20px', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--gradient-primary)', color: 'white',
      }}>
        <Clock size={26} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>{feature}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>{t('coming_soon_desc')}</p>
      <button
        onClick={() => navigate('/')}
        style={{ background: 'var(--gradient-primary)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 20, fontWeight: 'bold', cursor: 'pointer' }}
      >
        {t('explore_discover')}
      </button>
    </div>
  );
};
