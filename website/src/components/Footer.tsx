import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <Link to="/" className="footer-brand">
          <div className="logo-icon"><img src="/app-icon.png" alt="Beats.ly Logo" /></div>
          <span>Beats.ly</span>
        </Link>
        <div className="footer-links">
          <Link to="/pricing">Pricing</Link>
          <Link to="/download">Download</Link>
          <Link to="/#faq">FAQ</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 Beats.ly. All rights reserved.</p>
      </div>
    </footer>
  );
}
