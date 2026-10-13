import { Link } from 'react-router-dom';
import { SectionLink } from '../components/SectionLink';
import { motion } from 'framer-motion';
import { Coins, Crown, Sparkles, Cloud, Lock, X, Check, ArrowRight } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { FaqItem } from '../components/FaqItem';
import { findFaq } from '../data/faqs';
import { useT } from '../i18n/context';
import { richText } from '../i18n/rich';

const creditsFaq = findFaq('credits');

export function Pricing() {
  const { t } = useT();

  return (
    <>
      {/* Page intro */}
      <header className="page-intro">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 className="page-title" variants={fadeInUp}>
            {t('pricing_title_1')} <span className="glow-text">{t('pricing_title_2')}</span>
          </motion.h1>
          <motion.p className="page-subtitle" variants={fadeInUp}>
            {t('pricing_subtitle')}
          </motion.p>
        </motion.div>
      </header>

      {/* Pricing cards */}
      <section className="pricing">
        <motion.div
          className="pricing-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {/* Free Tier */}
          <motion.div className="pricing-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="pricing-header">
              <h3>{t('pricing_free')}</h3>
              <div className="price">$0<span>{t('pricing_per_month')}</span></div>
            </div>
            <ul className="pricing-features">
              <li><Coins size={16} /> {t('pricing_credits_day', { count: 3 })}</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> {t('pricing_ai_tool')}</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> {t('pricing_cloud_upload')}</li>
            </ul>
            <Link to="/download" className="btn btn-secondary pricing-btn">{t('pricing_get_started')}</Link>
          </motion.div>

          {/* Producer Pack */}
          <motion.div className="pricing-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="pricing-header">
              <h3>{t('pricing_producer')}</h3>
              <div className="price">$14.99<span>{t('pricing_per_month')}</span></div>
            </div>
            <ul className="pricing-features">
              <li><Coins size={16} color="var(--accent-secondary)" /> {t('pricing_credits_day', { count: 30 })}</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> {t('pricing_ai_tool')}</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> {t('pricing_cloud_upload')}</li>
            </ul>
            <button className="btn btn-secondary pricing-btn disabled" disabled>
              <Lock size={16} /> {t('common_coming_soon')}
            </button>
          </motion.div>

          {/* Ultimate Tier */}
          <motion.div className="pricing-card ultimate glass" variants={fadeInUp}>
            <div className="card-glow"></div>
            <div className="pricing-badge">{t('pricing_recommended')}</div>
            <div className="pricing-header">
              <h3>{t('pricing_ultimate')}</h3>
              <div className="price">$29.99<span>{t('pricing_per_month')}</span></div>
            </div>
            <ul className="pricing-features">
              <li><Crown size={16} color="#ffb703" /> {t('pricing_unlimited_downloads')}</li>
              <li><Sparkles size={16} color="var(--accent-tertiary)" /> {t('pricing_ai_included')}</li>
              <li><Cloud size={16} color="var(--accent-primary)" /> {t('pricing_premium_tag')}</li>
            </ul>
            <button className="btn btn-primary pricing-btn disabled" disabled>
              <Lock size={16} /> {t('common_coming_soon')}
            </button>
          </motion.div>
        </motion.div>

        <p className="pricing-legal-note">
          {richText(t('pricing_legal_note'), {
            terms: <Link to="/legal/terms">{t('footer_terms')}</Link>,
            payments: <Link to="/legal/payments">{t('footer_payments')}</Link>,
          })}
        </p>
      </section>

      {/* Comparison table */}
      <section className="compare-section">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
        >
          <h2 className="section-title">{t('pricing_compare_title_1')} <span className="glow-text">{t('pricing_compare_title_2')}</span></h2>
        </motion.div>

        {/* Vizibil doar sub breakpoint-ul mobil (via CSS) — tabelul rămâne cu
            scroll orizontal pe ecrane înguste, deci indicăm asta explicit. */}
        <p className="compare-hint">{t('pricing_swipe')}</p>

        <motion.div
          className="compare-table glass"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeInUp}
        >
          <div className="compare-row compare-head">
            <div className="compare-feature"></div>
            <div>Free</div>
            <div>Producer</div>
            <div className="compare-highlight">Ultimate</div>
          </div>
          <div className="compare-row">
            <div className="compare-feature">{t('pricing_row_credits')}</div>
            <div>{t('pricing_per_day', { count: 3 })}</div>
            <div>{t('pricing_per_day', { count: 30 })}</div>
            <div className="compare-highlight">{t('pricing_unlimited')}</div>
          </div>
          <div className="compare-row">
            <div className="compare-feature">{t('pricing_row_ai')}</div>
            <div><X size={16} className="compare-no" /></div>
            <div><X size={16} className="compare-no" /></div>
            <div className="compare-highlight"><Check size={16} className="compare-yes" /></div>
          </div>
          <div className="compare-row">
            <div className="compare-feature">{t('pricing_row_upload')}</div>
            <div><X size={16} className="compare-no" /></div>
            <div><X size={16} className="compare-no" /></div>
            <div className="compare-highlight"><Check size={16} className="compare-yes" /></div>
          </div>
          <div className="compare-row">
            <div className="compare-feature">{t('pricing_row_local')}</div>
            <div><Check size={16} className="compare-yes" /></div>
            <div><Check size={16} className="compare-yes" /></div>
            <div className="compare-highlight"><Check size={16} className="compare-yes" /></div>
          </div>
        </motion.div>
      </section>

      {/* Mini FAQ relevant to billing */}
      <section className="pricing-faq">
        <motion.div
          className="pricing-faq-inner"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeInUp}
        >
          <FaqItem id={creditsFaq.id} q={t(creditsFaq.q)} a={t(creditsFaq.a)} />
          <SectionLink section="faq" className="see-all-faq">
            {t('faq_see_all')} <ArrowRight size={16} />
          </SectionLink>
        </motion.div>
      </section>

      {/* Closing CTA */}
      <section className="pricing-cta">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeInUp}
        >
          <h2>{t('pricing_cta_title')}</h2>
          <p>{t('pricing_cta_text')}</p>
          <Link to="/download" className="btn btn-primary btn-large">
            {t('hero_cta_download')}
          </Link>
        </motion.div>
      </section>
    </>
  );
}
