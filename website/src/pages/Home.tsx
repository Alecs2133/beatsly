import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cloud, Sparkles, Library, Music, Users, Zap, Shield, ArrowRight, Download, Tag } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { FaqItem } from '../components/FaqItem';
import { FAQS } from '../data/faqs';
import { useT } from '../i18n/context';

export function Home() {
  const { t } = useT();

  return (
    <>
      {/* Hero Section */}
      <header className="hero">
        <motion.div
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1 className="hero-title" variants={fadeInUp}>
            {t('hero_title_1')} <br />
            <span className="glow-text">{t('hero_title_2')}</span>
          </motion.h1>
          <motion.p className="hero-subtitle" variants={fadeInUp}>
            {t('hero_subtitle')}
          </motion.p>
          <motion.div className="hero-cta" variants={fadeInUp}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/download" className="btn btn-primary">
                <Download size={18} />
                {t('hero_cta_download')}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/pricing" className="btn btn-secondary glass-btn">
                <Tag size={18} />
                {t('hero_cta_pricing')}
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 3D App Mockup */}
        <motion.div
          className="hero-mockup-container"
          initial={{ opacity: 0, y: 100, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.2, type: 'spring', bounce: 0.4 }}
        >
          <div className="mockup-glow"></div>
          <img
            src="/hero-app.png"
            alt={t('hero_mockup_alt')}
            className="mockup-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement?.classList.add('show-placeholder');
            }}
          />
          <div className="mockup-placeholder glass">
            <div className="placeholder-content">
              <Music size={48} style={{ opacity: 0.5 }} />
            </div>
          </div>
        </motion.div>
      </header>

      {/* Features Section */}
      <section id="features" className="features">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
        >
          <h2 className="section-title">{t('features_title_1')} <span className="glow-text">{t('features_title_2')}</span></h2>
        </motion.div>

        <motion.div
          className="features-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
        >
          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-secondary)' }}><Cloud size={32} /></div>
            <h3>{t('feature_cloud_title')}</h3>
            <p>{t('feature_cloud_text')}</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-tertiary)' }}><Sparkles size={32} /></div>
            <h3>{t('feature_ai_title')} <span className="version-badge" style={{ marginTop: 0, marginLeft: 8, fontSize: 11, padding: '3px 10px', verticalAlign: 'middle' }}>{t('common_coming_soon')}</span></h3>
            <p>{t('feature_ai_text')}</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-primary)' }}><Library size={32} /></div>
            <h3>{t('feature_library_title')}</h3>
            <p>{t('feature_library_text')}</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: '#fff' }}><Zap size={32} /></div>
            <h3>{t('feature_fast_title')}</h3>
            <p>{t('feature_fast_text')}</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: '#ffb703' }}><Shield size={32} /></div>
            <h3>{t('feature_verified_title')}</h3>
            <p>{t('feature_verified_text')}</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: '#06d6a0' }}><Users size={32} /></div>
            <h3>{t('feature_crews_title')}</h3>
            <p>{t('feature_crews_text')}</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Quick links: teaser catre paginile dedicate Pricing / Download */}
      <section className="quick-links">
        <motion.div
          className="quick-links-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <Link to="/pricing" className="quick-link-card glass">
              <div className="quick-link-icon" style={{ color: 'var(--accent-primary)' }}><Tag size={28} /></div>
              <div className="quick-link-text">
                <h3>{t('quick_pricing_title')}</h3>
                <p>{t('quick_pricing_text')}</p>
              </div>
              <ArrowRight className="quick-link-arrow" size={20} />
            </Link>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <Link to="/download" className="quick-link-card glass">
              <div className="quick-link-icon" style={{ color: 'var(--accent-secondary)' }}><Download size={28} /></div>
              <div className="quick-link-text">
                <h3>{t('quick_download_title')}</h3>
                <p>{t('quick_download_text')}</p>
              </div>
              <ArrowRight className="quick-link-arrow" size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
        >
          <h2 className="section-title">{t('faq_title_1')} <span className="glow-text">{t('faq_title_2')}</span></h2>
          <p className="faq-subtitle">{t('faq_subtitle')}</p>
        </motion.div>
        <motion.div
          className="faq-list"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {FAQS.map((item) => (
            <motion.div key={item.id} variants={fadeInUp}>
              <FaqItem id={item.id} q={t(item.q)} a={t(item.a)} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    </>
  );
}
