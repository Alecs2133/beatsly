import { Download, Cloud, Sparkles, ShoppingBag, Music, ArrowRight, Code, Zap, Shield, Crown, Lock, X, Check, Coins } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import './App.css';

// Animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Apple SVG Icon
const AppleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
);

// Windows SVG Icon
const WindowsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 448 512" fill="currentColor">
    <path d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28L448 480V268.4H203.8v177.9zm0-380.6v180.1H448V32L203.8 65.7z"/>
  </svg>
);

function App() {
  return (
    <div className="landing-container">
      {/* Floating background orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      
      {/* Navbar */}
      <nav className="navbar glass">
        <div className="nav-brand">
          <div className="logo-icon"><img src="/app-icon.png" alt="Beats.ly Logo" /></div>
          <span className="logo-text">Beats.ly</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#download">Download</a>
        </div>
        <div className="nav-actions">
          <a href="#download" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1 className="hero-title" variants={fadeInUp}>
            The Ultimate Hub for <br/>
            <span className="glow-text">Music Producers</span>
          </motion.h1>
          <motion.p className="hero-subtitle" variants={fadeInUp}>
            Manage your sounds, generate new samples with AI, and sync your entire library to the cloud. All in one beautiful, lightning-fast Windows application.
          </motion.p>
          <motion.div className="hero-cta" variants={fadeInUp} style={{ display: 'flex', flexWrap: 'wrap' }}>
            <a href="https://github.com/Alecs2133/beatsly/releases/download/v0.1.0-beta/beatsly_0.1.5_x64-setup.exe" className="btn btn-primary">
              <WindowsIcon />
              Download for Windows
            </a>
            <a href="https://github.com/Alecs2133/beatsly/releases/download/v0.1.0-beta/beatsly_0.1.5_aarch64.dmg" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <AppleIcon />
              Download for Mac
            </a>
          </motion.div>
        </motion.div>

        {/* 3D App Mockup */}
        <motion.div 
          className="hero-mockup-container"
          initial={{ opacity: 0, y: 100, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.2, type: "spring", bounce: 0.4 }}
        >
          <div className="mockup-glow"></div>
          <img src="/hero-app.png" alt="Beats.ly Interface" className="mockup-image" onError={(e) => {
            // Fallback placeholder if user hasn't added the image yet
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement?.classList.add('show-placeholder');
          }} />
          <div className="mockup-placeholder glass">
            <div className="placeholder-content">
              <Music size={48} style={{ opacity: 0.5, marginBottom: '20px' }} />
              <h3>App Screenshot Goes Here</h3>
              <p>Save your screenshot as <code style={{color: 'var(--accent-secondary)'}}>public/hero-app.png</code></p>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Features Section */}
      <section id="features" className="features">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2 className="section-title">Everything you need. <span className="glow-text">Nothing you don't.</span></h2>
        </motion.div>
        
        <motion.div 
          className="features-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
        >
          <motion.div className="feature-card glass" variants={fadeInUp}>
            <div className="feature-icon" style={{ color: 'var(--accent-secondary)' }}><Cloud size={32} /></div>
            <h3>Cloud Sync</h3>
            <p>Your library is safe. Upload your samples to the cloud and access them from any PC in the world.</p>
          </motion.div>
          
          <motion.div className="feature-card glass" variants={fadeInUp}>
            <div className="feature-icon" style={{ color: 'var(--accent-tertiary)' }}><Sparkles size={32} /></div>
            <h3>AI Generator</h3>
            <p>Stuck on an idea? Use our advanced AI to generate infinite unique royalty-free samples.</p>
          </motion.div>
          
          <motion.div className="feature-card glass" variants={fadeInUp}>
            <div className="feature-icon" style={{ color: 'var(--accent-primary)' }}><ShoppingBag size={32} /></div>
            <h3>Built-in Store</h3>
            <p>Buy, sell, and discover thousands of high-quality sample packs created by the community.</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp}>
            <div className="feature-icon" style={{ color: '#fff' }}><Zap size={32} /></div>
            <h3>Lightning Fast</h3>
            <p>Built with Rust & React, Beats.ly uses minimal RAM while analyzing thousands of audio files instantly.</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp}>
            <div className="feature-icon" style={{ color: '#ffb703' }}><Shield size={32} /></div>
            <h3>Secure Verification</h3>
            <p>Our premium Publisher roles are verified manually to ensure only the highest quality packs hit the store.</p>
          </motion.div>
          
          <motion.div className="feature-card glass" variants={fadeInUp}>
            <div className="feature-icon" style={{ color: '#06d6a0' }}><Code size={32} /></div>
            <h3>Developer Friendly</h3>
            <p>Open source and easily extensible. Built by producers, for producers.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2 className="section-title">Simple <span className="glow-text">Pricing</span></h2>
          <p style={{textAlign: 'center', color: 'var(--text-muted)', marginBottom: '60px', marginTop: '-40px'}}>Choose the plan that fits your workflow.</p>
        </motion.div>

        <motion.div 
          className="pricing-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {/* Free Tier */}
          <motion.div className="pricing-card glass" variants={fadeInUp}>
            <div className="pricing-header">
              <h3>Free</h3>
              <div className="price">$0<span>/month</span></div>
            </div>
            <ul className="pricing-features">
              <li><Coins size={16} /> 3 credits / day</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> AI Generator Tool</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> Cloud Uploading</li>
            </ul>
            <a href="#download" className="btn btn-secondary pricing-btn">Get Started</a>
          </motion.div>

          {/* Producer Pack */}
          <motion.div className="pricing-card glass" variants={fadeInUp}>
            <div className="pricing-header">
              <h3>Producer Pack</h3>
              <div className="price">$14.99<span>/month</span></div>
            </div>
            <ul className="pricing-features">
              <li><Coins size={16} color="var(--accent-secondary)" /> 30 credits / day</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> AI Generator Tool</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> Cloud Uploading</li>
            </ul>
            <button className="btn btn-secondary pricing-btn disabled" disabled>
              <Lock size={16} /> Coming Soon
            </button>
          </motion.div>

          {/* Ultimate Tier */}
          <motion.div className="pricing-card ultimate glass" variants={fadeInUp}>
            <div className="card-glow"></div>
            <div className="pricing-badge">RECOMMENDED</div>
            <div className="pricing-header">
              <h3>Ultimate Pack</h3>
              <div className="price">$29.99<span>/month</span></div>
            </div>
            <ul className="pricing-features">
              <li><Crown size={16} color="#ffb703" /> Unlimited Downloads (No credits)</li>
              <li><Sparkles size={16} color="var(--accent-tertiary)" /> AI Generator Tool Included</li>
              <li><Cloud size={16} color="var(--accent-primary)" /> Apply for a Premium Tag (Cloud Uploads)</li>
            </ul>
            <button className="btn btn-primary pricing-btn disabled" disabled>
              <Lock size={16} /> Coming Soon
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Download Section */}
      <section id="download" className="download-section">
        <div className="animated-bg"></div>
        <motion.div 
          className="download-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="download-icon-wrapper">
             <Download size={40} color="var(--accent-secondary)" />
          </motion.div>
          <motion.h2 variants={fadeInUp}>Ready to elevate your production?</motion.h2>
          <motion.p variants={fadeInUp}>Join thousands of producers who have already switched to Beats.ly.</motion.p>
          <motion.div variants={fadeInUp} style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '30px' }}>
            <motion.a 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              href="https://github.com/Alecs2133/beatsly/releases/download/v0.1.0-beta/beatsly_0.1.5_x64-setup.exe" 
              className="btn btn-primary btn-large"
            >
              <WindowsIcon />
              Download for Windows
            </motion.a>
            <motion.a 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              href="https://github.com/Alecs2133/beatsly/releases/download/v0.1.0-beta/beatsly_0.1.5_aarch64.dmg" 
              className="btn btn-secondary btn-large glass-btn"
            >
              <AppleIcon />
              Download for Mac
            </motion.a>
          </motion.div>
          <motion.p variants={fadeInUp} className="download-note">Available for Windows (x64) and Mac (Apple Silicon)</motion.p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo-icon"><img src="/app-icon.png" alt="Beats.ly Logo" /></div>
            <span>Beats.ly</span>
          </div>
          <div className="footer-links">
            <a href="https://github.com/Alecs2133/beatsly" target="_blank" rel="noreferrer"><Code size={20} /> source</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Beats.ly. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
