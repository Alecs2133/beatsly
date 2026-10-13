import { Link } from 'react-router-dom';
import { SectionLink } from './SectionLink';
import { useT } from '../i18n/context';

export function Footer() {
  const { t } = useT();

  return (
    <footer className="footer">
      <div className="footer-content">
        <Link to="/" className="footer-brand">
          <div className="logo-icon"><img src="/app-icon.png" alt="Beats.ly Logo" /></div>
          <span>Beats.ly</span>
        </Link>
        <div className="footer-links">
          <Link to="/pricing">{t('nav_pricing')}</Link>
          <Link to="/download">{t('nav_download')}</Link>
          <SectionLink section="faq">{t('nav_faq')}</SectionLink>
        </div>
      </div>

      <nav className="footer-legal" aria-label={t('footer_legal')}>
        <Link to="/legal/terms">{t('footer_terms')}</Link>
        <Link to="/legal/privacy">{t('footer_privacy')}</Link>
        <Link to="/legal/cookies">{t('footer_cookies')}</Link>
        <Link to="/legal/payments">{t('footer_payments')}</Link>
        {/* Obligatorii pentru comercianții online din România (Ordinul ANPC
            449/2022): link către ANPC și către procedura SAL. */}
        <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer">{t('footer_anpc')}</a>
        <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer">{t('footer_sal')}</a>
      </nav>

      <div className="footer-bottom">
        <p>{t('footer_rights', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
