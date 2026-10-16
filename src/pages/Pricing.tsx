import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import { open } from '@tauri-apps/plugin-shell';
import { hasUnlimitedCredits } from '../lib/roles';
import { errorMessage } from '../lib/errors';
import './Pricing.css';

/** Butonul unui plan: „Planul curent” pe cel pe care ești, „În curând” pe rest (abonamentele nu sunt încă deschise). */
function PlanButton({ current, t }: { current: boolean; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <button className={`plan-btn ${current ? 'secondary' : 'primary'}`} disabled>
      {current ? t('current_plan') : t('coming_soon')}
    </button>
  );
}

export const Pricing: React.FC = () => {
  const { profile, user } = useAuthStore();
  const { showToast } = useAppStore();
  const { t } = useTranslation();
  // Acordul pentru livrarea imediată a creditelor (și pierderea dreptului de
  // retragere — OUG 34/2014, art. 16 lit. m). Fără el nu pornim plata.
  const [purchaseConsent, setPurchaseConsent] = useState(false);

  if (!profile || !user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-secondary)' }}>{t('auth_required')}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{t('auth_required_desc')}</p>
      </div>
    );
  }

  const handleBuyCredits = async (amount: number) => {
    if (!purchaseConsent) {
      showToast(t('purchase_consent_required'), 'error');
      return;
    }
    try {
      showToast(`${t('processing_payment')}…`, 'info');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        // user_id se derivă din JWT în edge function, nu se trimite din client.
        body: { amount, item_type: 'credits' }
      });

      if (error) throw error;
      if (data?.url) {
        // Deschidem fereastra browserului pentru plata sigură Stripe
        await open(data.url);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error(err);
      showToast(`${t('error_prefix')} ${errorMessage(err)}`, 'error');
    }
  };



  const openLegal = (doc: 'terms' | 'payments') => {
    open(`https://beatsly.vercel.app/legal/${doc}`).catch(err => console.error('Failed to open legal page:', err));
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
          <div className="value">
            {t(profile.tier === 'ultimate' ? 'ultimate_pack' : profile.tier === 'producer' ? 'producer_pack' : 'free')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3>{t('available_credits')}</h3>
          <div className="value credits-value">
            {hasUnlimitedCredits(profile.role, profile.tier) ? t('unlimited') : <span className="num">{profile.credits}</span>}
          </div>
        </div>
      </div>

      <div className="plans-grid">
        <div className="plan-card">
          <h2>{t('free')}</h2>
          <div className="plan-price">$0<span>{t('per_month')}</span></div>
          <ul className="plan-features">
            <li>3 {t('credits_day')}</li>
            <li className="unavailable">{t('ai_generator')}</li>
            <li className="unavailable">{t('cloud_uploading')}</li>
          </ul>
          <PlanButton current={profile.tier === 'free'} t={t} />
        </div>

        <div className="plan-card">
          <h2>{t('producer_pack')}</h2>
          <div className="plan-price">$14.99<span>{t('per_month')}</span></div>
          <ul className="plan-features">
            <li>30 {t('credits_day')}</li>
            <li className="unavailable">{t('ai_generator')}</li>
            <li className="unavailable">{t('cloud_uploading')}</li>
          </ul>
          <PlanButton current={profile.tier === 'producer'} t={t} />
        </div>

        <div className="plan-card ultimate">
          <h2>{t('ultimate_pack')}</h2>
          <div className="plan-price">$29.99<span>{t('per_month')}</span></div>
          <ul className="plan-features">
            <li>{t('unlimited_downloads')}</li>
            <li>{t('ai_generator_included')}</li>
            <li>{t('apply_producer_tag')}</li>
          </ul>
          <PlanButton current={profile.tier === 'ultimate'} t={t} />
        </div>
      </div>

      {profile.tier !== 'ultimate' && (
        <div className="credits-section">
          <h2>{t('buy_download_credits')}</h2>
          <label className="purchase-consent">
            <input
              type="checkbox"
              checked={purchaseConsent}
              onChange={e => setPurchaseConsent(e.target.checked)}
            />
            <span>
              {t('purchase_consent')}{' '}
              <button type="button" className="legal-link" onClick={() => openLegal('terms')}>{t('legal_terms')}</button>
              {' · '}
              <button type="button" className="legal-link" onClick={() => openLegal('payments')}>{t('legal_payments')}</button>
            </span>
          </label>
          <div className={`credits-grid${purchaseConsent ? '' : ' consent-pending'}`}>
            {[
              { credits: 10, price: 2.99 },
              { credits: 25, price: 5.99 },
              { credits: 50, price: 9.99 },
              { credits: 150, price: 24.99 },
              { credits: 300, price: 39.99 }
            ].map(pack => (
              <div key={pack.credits} className="credit-pack" onClick={() => handleBuyCredits(pack.credits)}>
                <div className="credit-amount num">{pack.credits}</div>
                <div className="credit-price">${pack.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
