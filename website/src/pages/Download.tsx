import { motion } from 'framer-motion';
import { Download as DownloadIcon, MonitorCheck, LogIn, FolderDown, PlayCircle } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { AppleIcon, WindowsIcon } from '../components/PlatformIcons';
import { useLayoutContext } from '../Layout';
import { useLatestRelease } from '../lib/useLatestRelease';

// Fallback derivat din package.json, folosit doar cât timp cererea către
// GitHub nu s-a terminat încă (de obicei sub o secundă) sau dacă eșuează.
// NU mai e sursa de adevăr — aceea e ultimul release publicat pe GitHub,
// citit live de `useLatestRelease`. Îl păstrăm ca plasă de siguranță, ca
// butonul de download să nu rămână niciodată gol sau dezactivat.
const RELEASES_BASE = 'https://github.com/Alecs2133/beatsly/releases/download';
const FALLBACK_WIN_URL = `${RELEASES_BASE}/v${__APP_VERSION__}/beatsly_${__APP_VERSION__}_x64-setup.exe`;
const FALLBACK_MAC_URL = `${RELEASES_BASE}/v${__APP_VERSION__}/beatsly_${__APP_VERSION__}_aarch64.dmg`;

const STEPS = [
  { icon: FolderDown, title: 'Download', text: 'Grab the installer for your platform below.' },
  { icon: PlayCircle, title: 'Install & open', text: 'Run the installer and launch Beats.ly.' },
  { icon: LogIn, title: 'Sign in', text: 'Create a free account to sync your library to the cloud.' },
];

export function DownloadPage() {
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
            Download <span className="glow-text">Beats.ly</span>
          </motion.h1>
          <motion.p className="page-subtitle" variants={fadeInUp}>
            Available for Windows and macOS. Free to install, sign in to sync your library.
          </motion.p>
          <motion.p className="version-badge" variants={fadeInUp}>
            Latest version: {displayVersion}
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
          <motion.h2 variants={fadeInUp}>Ready to elevate your production?</motion.h2>
          <motion.p variants={fadeInUp}>Grab the build for your operating system and start syncing in minutes.</motion.p>
          <motion.div variants={fadeInUp} style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '30px' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDownload(winUrl)}
              className="btn btn-primary btn-large"
            >
              <WindowsIcon />
              Download for Windows
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDownload(macUrl)}
              className="btn btn-secondary btn-large glass-btn"
            >
              <AppleIcon />
              Download for Mac
            </motion.button>
          </motion.div>
          <motion.p variants={fadeInUp} className="download-note">Available for Windows (x64) and Mac (Apple Silicon)</motion.p>
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
          <h2 className="section-title">Up and running <span className="glow-text">in a minute</span></h2>
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
              <h3>{step.title}</h3>
              <p>{step.text}</p>
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
          <h2 className="section-title">System <span className="glow-text">Requirements</span></h2>
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
              <li><MonitorCheck size={14} /> Windows 10 or 11</li>
              <li><MonitorCheck size={14} /> 64-bit (x64)</li>
            </ul>
          </motion.div>

          <motion.div className="requirement-card glass" variants={fadeInUp}>
            <div className="requirement-icon"><AppleIcon /></div>
            <h3>macOS</h3>
            <ul>
              <li><MonitorCheck size={14} /> Apple Silicon (M-series)</li>
              <li><MonitorCheck size={14} /> Intel Mac build coming soon</li>
            </ul>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
