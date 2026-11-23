import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Check, Copy, FlaskConical, MonitorCheck, MonitorSmartphone } from 'lucide-react';
import { detectDesktopOS } from '../lib/platform';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { AppleIcon, LinuxIcon, WindowsIcon } from '../components/PlatformIcons';
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
const FALLBACK_LINUX_URL = `${RELEASES_BASE}/v${__APP_VERSION__}/beatsly_${__APP_VERSION__}_amd64.AppImage`;

const STEPS: { title: TranslationKey; text: TranslationKey }[] = [
  { title: 'download_step1_title', text: 'download_step1_text' },
  { title: 'download_step2_title', text: 'download_step2_text' },
  { title: 'download_step3_title', text: 'download_step3_text' },
];

export function DownloadPage() {
  const { t } = useT();
  const { user, requestAuth } = useLayoutContext();
  const latest = useLatestRelease();

  const winUrl = latest.windowsUrl ?? FALLBACK_WIN_URL;
  const macUrl = latest.macUrl ?? FALLBACK_MAC_URL;
  // AppImage, nu .deb: merge pe orice distribuție și e singurul format pe care
  // aplicația se poate actualiza singură.
  const linuxUrl = latest.linuxAppImageUrl ?? FALLBACK_LINUX_URL;
  // Site-ul se publică la push, dar installerele apar abia după ce se termină
  // build-ul release-ului. Până atunci nu arătăm un buton care duce în gol:
  // cât se încarcă îl presupunem acolo, iar dacă release-ul chiar n-are
  // AppImage, butonul de Linux dispare.
  const hasLinux = latest.loading || !!latest.linuxAppImageUrl;
  const displayVersion = latest.tag ?? `v${__APP_VERSION__}`;

  // Doar Windows și macOS: pe telefon, tabletă sau TV installerul n-ar rula.
  const os = useMemo(detectDesktopOS, []);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocat — linkul e oricum scris pe ecran
    }
  };

  const handleDownload = (url: string) => {
    if (!os) return;
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
            {t('download_title_1')} <span className="brand-inline">beats<em>.ly</em></span>
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
        <motion.div
          className="download-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          {os && (
            <>
              <motion.h2 variants={fadeInUp}>{t('download_ready_title')}</motion.h2>
              {/* Pe Linux promisiunea „se actualizează singură” e valabilă doar
                  pentru AppImage — detaliul e în caseta de mai jos. */}
              <motion.p variants={fadeInUp}>{t(os === 'linux' ? 'download_ready_text_linux' : 'download_ready_text')}</motion.p>
            </>
          )}
          {os ? (
            <motion.div variants={fadeInUp} className="download-buttons">
              {/* Sistemul detectat primește butonul principal */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleDownload(winUrl)}
                className={`btn btn-large ${os === 'windows' ? 'btn-primary' : 'btn-secondary glass-btn'}`}
              >
                <WindowsIcon />
                {t('download_windows')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleDownload(macUrl)}
                className={`btn btn-large ${os === 'mac' ? 'btn-primary' : 'btn-secondary glass-btn'}`}
              >
                <AppleIcon />
                {t('download_mac')}
              </motion.button>
              {hasLinux && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleDownload(linuxUrl)}
                  className={`btn btn-large ${os === 'linux' ? 'btn-primary' : 'btn-secondary glass-btn'}`}
                >
                  <LinuxIcon />
                  {t('download_linux')}
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div variants={fadeInUp} className="download-blocked" role="note">
              <MonitorSmartphone size={22} />
              <div>
                <strong>{t('download_desktop_only_title')}</strong>
                <p>{t('download_desktop_only_text')}</p>
                <button type="button" className="btn btn-secondary" onClick={copyLink}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t('download_link_copied') : t('download_copy_link')}
                </button>
              </div>
            </motion.div>
          )}
          {/* Linux e proaspăt și n-a fost încercat pe toate distribuțiile —
              spunem asta înainte să descarce, nu după. */}
          {/* Pe Linux, dar release-ul publicat încă n-are AppImage: se
              construiește. Fără nota asta ar vedea doar butoane de Windows și
              Mac, fără să înțeleagă de ce. */}
          {os === 'linux' && !hasLinux && (
            <motion.div variants={fadeInUp} className="download-beta" role="note">
              <FlaskConical size={20} />
              <div>
                <strong>{t('download_linux_soon_title')}</strong>
                <p>{t('download_linux_soon_text')}</p>
              </div>
            </motion.div>
          )}
          {os === 'linux' && hasLinux && (
            <motion.div variants={fadeInUp} className="download-beta" role="note">
              <FlaskConical size={20} />
              <div>
                <strong>{t('download_linux_beta_title')}</strong>
                <p>{t('download_linux_beta_text')}</p>
                {latest.linuxDebUrl && (
                  <button type="button" className="btn btn-secondary" onClick={() => handleDownload(latest.linuxDebUrl!)}>
                    {t('download_linux_deb')}
                  </button>
                )}
              </div>
            </motion.div>
          )}
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
            <motion.div key={step.title} className="step-card glass" variants={fadeInUp}>
              <div className="step-number">{String(i + 1).padStart(2, '0')}</div>
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

          <motion.div className="requirement-card glass" variants={fadeInUp}>
            <div className="requirement-icon"><LinuxIcon /></div>
            <h3>Linux</h3>
            <ul>
              <li><MonitorCheck size={14} /> {t('download_req_linux_os')}</li>
              <li><MonitorCheck size={14} /> {t('download_req_linux_deps')}</li>
            </ul>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
