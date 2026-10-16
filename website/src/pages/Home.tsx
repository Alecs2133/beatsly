import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Download } from 'lucide-react';
import type { TranslationKey } from '../i18n/en';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useLatestRelease } from '../lib/useLatestRelease';
import { FaqItem } from '../components/FaqItem';
import { KeyDemo } from '../components/KeyDemo';
import { FAQS } from '../data/faqs';
import { useT } from '../i18n/context';
import './Home.css';

const STEPS: { title: TranslationKey; text: TranslationKey; keys?: string[] }[] = [
  { title: 'step_1_title', text: 'step_1_text' },
  { title: 'step_2_title', text: 'step_2_text', keys: ['Ctrl', 'K'] },
  { title: 'step_3_title', text: 'step_3_text' },
];

const SPECS: { title: TranslationKey; text: TranslationKey; soon?: boolean }[] = [
  { title: 'feature_library_title', text: 'feature_library_text' },
  { title: 'feature_cloud_title', text: 'feature_cloud_text' },
  { title: 'feature_verified_title', text: 'feature_verified_text' },
  { title: 'feature_crews_title', text: 'feature_crews_text' },
  { title: 'feature_ai_title', text: 'feature_ai_text', soon: true },
];

/** Linia trasă de mână sub un cuvânt din titlu. */
function Scribble() {
  return (
    <svg className="scribble" viewBox="0 0 200 18" preserveAspectRatio="none" aria-hidden>
      <path d="M3 12c22-6 46-8 70-6s40 6 62 3c18-2 36-7 62-5" />
      <path d="M18 15c34-3 70-2 104-1" />
    </svg>
  );
}

/** Cuvintele cu cratimă („sample-ul”, „să-ți”) nu se rup la capăt de rând. */
function keepHyphenated(text: string) {
  return text.split(/(\s+)/).map((part, i) =>
    part.includes('-') ? <span key={i} className="nowrap">{part}</span> : part
  );
}

export function Home() {
  const { t } = useT();
  const latest = useLatestRelease();
  const version = latest.tag ?? `v${__APP_VERSION__}`;

  return (
    <>
      <header className="home-hero">
        <motion.div className="home-hero-text" initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.p className="home-kicker" variants={fadeInUp}>{t('hero_kicker')}</motion.p>
          <motion.h1 variants={fadeInUp}>
            {keepHyphenated(t('hero_title_a'))}
            <span className="marked">{t('hero_title_mark')}<Scribble /></span>
            {keepHyphenated(t('hero_title_b'))}
          </motion.h1>
          <motion.p className="home-lead" variants={fadeInUp}>{t('hero_lead')}</motion.p>
          <motion.div className="home-cta" variants={fadeInUp}>
            <Link to="/download" className="btn btn-primary">
              <Download size={18} /> {t('hero_cta_download')}
            </Link>
            <Link to="/pricing" className="btn btn-secondary">{t('hero_cta_pricing')}</Link>
          </motion.div>
          <motion.p className="home-meta" variants={fadeInUp}>
            <span className="num">{version}</span> · {t('hero_meta')}
          </motion.p>
        </motion.div>

        <motion.div
          className="home-hero-demo"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="hand-note" aria-hidden>
            {t('demo_note')}
            <svg viewBox="0 0 60 40"><path d="M4 6c14 2 30 10 40 26M44 32l-9-1M44 32l1-9" /></svg>
          </p>
          <KeyDemo />
        </motion.div>
      </header>

      {/* Cum lucrezi cu ea — trei pași, fără iconițe decorative */}
      <section className="home-section">
        <div className="home-section-head">
          <h2>{t('steps_title')}</h2>
          <p>{t('steps_sub')}</p>
        </div>
        <motion.ol
          className="home-steps"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer}
        >
          {STEPS.map((s, i) => (
            <motion.li key={s.title} variants={fadeInUp}>
              <span className="step-n num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{t(s.title)}</h3>
              <p>{t(s.text)}</p>
              {s.keys && (
                <span className="kbd-row" aria-hidden>
                  {s.keys.map(k => <kbd key={k}>{k}</kbd>)}
                </span>
              )}
            </motion.li>
          ))}
        </motion.ol>
      </section>

      {/* Captură reală din aplicație */}
      <section className="home-shot">
        <figure>
          <img src="/app-discover.jpg" alt={t('hero_mockup_alt')} loading="lazy" width={1440} height={900} />
          <figcaption>{t('shot_caption', { version })}</figcaption>
        </figure>
      </section>

      {/* Fișa tehnică: ce face, spus simplu */}
      <section className="home-section">
        <div className="home-section-head">
          <h2>{t('specs_title')}</h2>
        </div>
        <dl className="home-specs">
          {SPECS.map(s => (
            <div key={s.title}>
              <dt>
                {t(s.title)}
                {s.soon && <span className="soon-badge">{t('common_coming_soon')}</span>}
              </dt>
              <dd>{t(s.text)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="faq" className="home-section">
        <div className="home-section-head">
          <h2>{t('faq_heading')}</h2>
          <p>{t('faq_subtitle')}</p>
        </div>
        <div className="faq-list">
          {FAQS.map(item => (
            <FaqItem key={item.id} id={item.id} q={t(item.q)} a={t(item.a)} />
          ))}
        </div>
      </section>

      <section className="home-end">
        <h2>{t('end_title')}</h2>
        <p>{t('end_text')}</p>
        <Link to="/download" className="btn btn-primary">
          {t('hero_cta_download')} <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}
