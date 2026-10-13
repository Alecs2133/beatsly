import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, ArrowRight, Download, Tag } from 'lucide-react';
import { Icon, type IconName } from '../components/Icon';
import { HeroSignal } from '../components/HeroSignal';
import type { TranslationKey } from '../i18n/en';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { FaqItem } from '../components/FaqItem';
import { FAQS } from '../data/faqs';
import { useT } from '../i18n/context';

const FEATURES: { icon: IconName; title: TranslationKey; text: TranslationKey; soon?: boolean }[] = [
  { icon: 'upload', title: 'feature_cloud_title', text: 'feature_cloud_text' },
  { icon: 'sparkle', title: 'feature_ai_title', text: 'feature_ai_text', soon: true },
  { icon: 'headphones', title: 'feature_library_title', text: 'feature_library_text' },
  { icon: 'signal', title: 'feature_fast_title', text: 'feature_fast_text' },
  { icon: 'check', title: 'feature_verified_title', text: 'feature_verified_text' },
  { icon: 'crew', title: 'feature_crews_title', text: 'feature_crews_text' },
];

/** Titlul apare cuvânt cu cuvânt, din blur. */
function Words({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={`${word}-${i}`} className="hero-word" style={{ '--i': i + offset } as React.CSSProperties}>
          {word}{' '}
        </span>
      ))}
    </>
  );
}

export function Home() {
  const { t } = useT();
  const firstLineWords = t('hero_title_1').split(' ').length;

  return (
    <>
      {/* Hero Section */}
      <header className="hero">
        <HeroSignal />
        <motion.div
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <h1 className="hero-title">
            <Words text={t('hero_title_1')} />
            <br />
            <span className="glow-text"><Words text={t('hero_title_2')} offset={firstLineWords} /></span>
          </h1>
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
          {FEATURES.map((f) => (
            <motion.div key={f.title} className="feature-card glass bi-trigger" variants={fadeInUp}>
              <div className="feature-icon"><Icon name={f.icon} size={24} /></div>
              <h3>
                {t(f.title)}
                {f.soon && <span className="soon-badge">{t('common_coming_soon')}</span>}
              </h3>
              <p>{t(f.text)}</p>
            </motion.div>
          ))}
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
