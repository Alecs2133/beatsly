import { motion } from 'framer-motion';
import { Download as DownloadIcon, MonitorCheck, LogIn, FolderDown, PlayCircle } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { AppleIcon, WindowsIcon } from '../components/PlatformIcons';
import { useLayoutContext } from '../lib/layoutContext';
import { useLatestRelease } from '../lib/useLatestRelease';
import { useT } from '../i18n/context';
import type { TranslationKey } from '../i18n/en';

// Fallback derivat din package.json, folosit doar cât timp cererea către
// GitHub nu s-a terminat încă (de obicei sub o secundă) sau dacă eșuează.
// NU mai e sursa de adevăr — aceea e ultimul release publicat pe GitHub,
// citit live de `useLatestRelease`. Îl păstrăm ca plasă de siguranță, ca
// butonul de download să nu rămână niciodată gol sau dezactivat.
const RELEASES_BASE = 'https://github.com/Alecs2133/beatsly/releases/download';
const FALLBACK_WIN_URL = `${RELEASES_BASE}/v${__APP_VERSION__}/beatsly_${__APP_VERSION__}_x64-setup.exe`;
const FALLBACK_MAC_URL = `${RELEASES_BASE}/v${__APP_VERSION__}/beatsly_${__APP_VERSION__}_aarch64.dmg`;

const STEPS: { icon: typeof FolderDown; title: TranslationKey; text: TranslationKey }[] = [
  { icon: FolderDown, title: 'download_step1_title', text: 'download_step1_text' },
  { icon: PlayCircle, title: 'download_step2_title', text: 'download_step2_text' },
  { icon: LogIn, title: 'download_step3_title', text: 'download_step3_text' },
];

export function DownloadPage() {
  const { t } = useT();
  const { user, requestAuth } = useLayoutContext();
  const latest = useLatestRelease();

  const winUrl = latest.windowsUrl ?? FALLBACK_WIN_URL;
  const macUrl = latest.macUrl ?? FALLBACK_MAC_URL;
  const displayVersion = latest.tag ?? `v${__APP_VERSION__}`;

  const handleDownload = (url: string) => {
    if (!user) {
      requestAuth();
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Page intro */}
      <header className="page-intro">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 className="page-title" variants={fadeInUp}>
            {t('download_title_1')} <span className="glow-text">Beats.ly</span>
          </motion.h1>
          <motion.p className="page-subtitle" variants={fadeInUp}>
            {t('download_subtitle')}
          </motion.p>
          <motion.p className="version-badge" variants={fadeInUp}>
            {t('download_latest', { version: displayVersion })}
          </motion.p>
        </motion.div>
      </header>

      {/* Main download CTA */}
      <section className="download-section">
        <div className="animated-bg"></div>
        <motion.div
          className="download-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="download-icon-wrapper">
            <DownloadIcon size={40} color="var(--accent-secondary)" />
          </motion.div>
          <motion.h2 variants={fadeInUp}>{t('download_ready_title')}</motion.h2>
          <motion.p variants={fadeInUp}>{t('download_ready_text')}</motion.p>
          <motion.div variants={fadeInUp} style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '30px' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDownload(winUrl)}
              className="btn btn-primary btn-large"
            >
              <WindowsIcon />
              {t('download_windows')}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDownload(macUrl)}
              className="btn btn-secondary btn-large glass-btn"
            >
              <AppleIcon />
              {t('download_mac')}
            </motion.button>
          </motion.div>
          <motion.p variants={fadeInUp} className="download-note">{t('download_note')}</motion.p>
        </motion.div>
      </section>

      {/* Installation steps */}
      <section className="steps-section">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
        >
          <h2 className="section-title">{t('download_steps_title_1')} <span className="glow-text">{t('download_steps_title_2')}</span></h2>
        </motion.div>

        <motion.div
          className="steps-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
        >
          {STEPS.map((step, i) => (
            <motion.div key={step.title} className="step-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
              <div className="step-number">{i + 1}</div>
              <div className="step-icon"><step.icon size={28} /></div>
              <h3>{t(step.title)}</h3>
              <p>{t(step.text)}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* System requirements */}
      <section className="requirements-section">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
        >
          <h2 className="section-title">{t('download_req_title_1')} <span className="glow-text">{t('download_req_title_2')}</span></h2>
        </motion.div>

        <motion.div
          className="requirements-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
        >
          <motion.div className="requirement-card glass" variants={fadeInUp}>
            <div className="requirement-icon"><WindowsIcon /></div>
            <h3>Windows</h3>
            <ul>
              <li><MonitorCheck size={14} /> {t('download_req_win_os')}</li>
              <li><MonitorCheck size={14} /> {t('download_req_win_arch')}</li>
            </ul>
          </motion.div>

          <motion.div className="requirement-card glass" variants={fadeInUp}>
            <div className="requirement-icon"><AppleIcon /></div>
            <h3>macOS</h3>
            <ul>
              <li><MonitorCheck size={14} /> {t('download_req_mac_arch')}</li>
              <li><MonitorCheck size={14} /> {t('download_req_mac_intel')}</li>
            </ul>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
