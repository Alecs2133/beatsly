import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import { open } from '@tauri-apps/plugin-shell';
import { Coins } from 'lucide-react';
import './Pricing.css';

export const Pricing: React.FC = () => {
  const { profile, user } = useAuthStore();
  const { showToast } = useAppStore();
  const { t } = useTranslation();
  const [isApplying, setIsApplying] = useState(false);
  const [socialLinks, setSocialLinks] = useState('');

  if (!profile || !user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-secondary)' }}>{t('auth_required')}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{t('auth_required_desc')}</p>
      </div>
    );
  }

  const handleBuyCredits = async (amount: number) => {
    try {
      showToast(`${t('processing_payment')}...`, 'info');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { amount, item_type: 'credits', user_id: user.id }
      });

      if (error) throw error;
      if (data?.url) {
        // Deschidem fereastra browserului pentru plata sigură Stripe
        await open(data.url);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Error: ${err.message || JSON.stringify(err)}`, 'error');
    }
  };



  const handleApplyProducer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialLinks) return;

    try {
      setIsApplying(true);
      const { error } = await supabase
        .from('role_requests')
        .insert({
          user_id: user.id,
          social_links: socialLinks,
          status: 'pending'
        });

      if (error) throw error;

      showToast(t('application_sent'), 'success');
      setSocialLinks('');
    } catch (err: any) {
      console.error(err);
      showToast(t('application_failed') + ': ' + err.message, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>{t('store_title')}</h1>
        <p>{t('store_subtitle')}</p>
      </div>

      <div className="current-status">
        <div>
          <h3>{t('current_plan')}</h3>
          <div className="value" style={{ textTransform: 'capitalize' }}>
            {profile.tier} {t('pack')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3>{t('available_credits')}</h3>
          <div className="value credits-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
            {profile.tier === 'ultimate' ? t('unlimited') : profile.credits} <Coins size={24} color="var(--accent-secondary)" />
          </div>
        </div>
      </div>

      <div className="plans-grid">
        <div className="plan-card">
          <h2>{t('free')}</h2>
          <div className="plan-price">$0<span>/month</span></div>
          <ul className="plan-features">
            <li>5 {t('credits_day')}</li>
            <li className="unavailable">{t('ai_generator')}</li>
            <li className="unavailable">{t('cloud_uploading')}</li>
          </ul>
          <button className="plan-btn secondary" disabled>{t('current_plan')}</button>
        </div>

        <div className="plan-card">
          <h2>{t('producer_pack')}</h2>
          <div className="plan-price">$20<span>/month</span></div>
          <ul className="plan-features">
            <li>100 {t('credits_day')}</li>
            <li className="unavailable">{t('ai_generator')}</li>
            <li className="unavailable">{t('cloud_uploading')}</li>
          </ul>
          <button
            className="plan-btn primary"
            disabled={true}
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            {t('coming_soon')}
          </button>
        </div>

        <div className="plan-card ultimate">
          <h2 style={{ color: 'var(--accent-primary)' }}>{t('ultimate_pack')}</h2>
          <div className="plan-price">$40<span>/month</span></div>
          <ul className="plan-features">
            <li>{t('unlimited_downloads')}</li>
            <li>{t('ai_generator_included')}</li>
            <li>{t('apply_producer_tag')}</li>
          </ul>
          <button
            className="plan-btn primary"
            disabled={true}
            style={{ background: 'var(--accent-primary)', color: '#000', opacity: 0.5, cursor: 'not-allowed' }}
          >
            {t('coming_soon')}
          </button>
        </div>
      </div>

      {profile.tier === 'ultimate' && (
        <div style={{ background: 'rgba(0, 255, 204, 0.05)', padding: '30px', borderRadius: '16px', marginBottom: '60px', border: '1px solid var(--accent-primary)' }}>
          <h2 style={{ color: 'var(--accent-primary)', marginBottom: '15px' }}>{t('apply_producer_title')}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            {t('apply_producer_desc')}
          </p>
          <form onSubmit={handleApplyProducer} style={{ display: 'flex', gap: '15px' }}>
            <input
              type="text"
              placeholder="https://instagram.com/your_handle"
              value={socialLinks}
              onChange={e => setSocialLinks(e.target.value)}
              style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
              required
            />
            <button
              type="submit"
              disabled={isApplying}
              style={{ padding: '0 30px', borderRadius: '8px', border: 'none', background: 'var(--accent-primary)', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {isApplying ? t('sending') : t('submit_request')}
            </button>
          </form>
        </div>
      )}

      {profile.tier !== 'ultimate' && (
        <div className="credits-section">
          <h2>{t('buy_download_credits')}</h2>
          <div className="credits-grid">
            {[
              { credits: 1, price: 1 },
              { credits: 5, price: 3 },
              { credits: 10, price: 5 },
              { credits: 20, price: 9 },
              { credits: 50, price: 20 },
              { credits: 100, price: 35 },
              { credits: 200, price: 60 }
            ].map(pack => (
              <div key={pack.credits} className="credit-pack" onClick={() => handleBuyCredits(pack.credits)}>
                <div className="credit-amount" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>{pack.credits} <Coins size={18} /></div>
                <div className="credit-price">${pack.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
