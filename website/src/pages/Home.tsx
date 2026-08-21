import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cloud, Sparkles, ShoppingBag, Music, Code, Zap, Shield, ArrowRight, Download, Tag } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { FaqItem } from '../components/FaqItem';
import { FAQS } from '../data/faqs';

export function Home() {
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
            The Ultimate Hub for <br />
            <span className="glow-text">Music Producers</span>
          </motion.h1>
          <motion.p className="hero-subtitle" variants={fadeInUp}>
            Manage your sounds, generate new samples with AI, and sync your entire library to the cloud. All in one beautiful, lightning-fast Windows application.
          </motion.p>
          <motion.div className="hero-cta" variants={fadeInUp}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/download" className="btn btn-primary">
                <Download size={18} />
                Download Beats.ly
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/pricing" className="btn btn-secondary glass-btn">
                <Tag size={18} />
                View Pricing
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
            alt="Beats.ly Interface"
            className="mockup-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement?.classList.add('show-placeholder');
            }}
          />
          <div className="mockup-placeholder glass">
            <div className="placeholder-content">
              <Music size={48} style={{ opacity: 0.5, marginBottom: '20px' }} />
              <h3>App Screenshot Goes Here</h3>
              <p>Save your screenshot as <code style={{ color: 'var(--accent-secondary)' }}>public/hero-app.png</code></p>
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
          <h2 className="section-title">Everything you need. <span className="glow-text">Nothing you don't.</span></h2>
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
            <h3>Cloud Sync</h3>
            <p>Your library is safe. Upload your samples to the cloud and access them from any PC in the world.</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-tertiary)' }}><Sparkles size={32} /></div>
            <h3>AI Generator</h3>
            <p>Stuck on an idea? Use our advanced AI to generate infinite unique royalty-free samples.</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: 'var(--accent-primary)' }}><ShoppingBag size={32} /></div>
            <h3>Built-in Store</h3>
            <p>Buy, sell, and discover thousands of high-quality sample packs created by the community.</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: '#fff' }}><Zap size={32} /></div>
            <h3>Lightning Fast</h3>
            <p>Built with Rust & React, Beats.ly uses minimal RAM while analyzing thousands of audio files instantly.</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: '#ffb703' }}><Shield size={32} /></div>
            <h3>Secure Verification</h3>
            <p>Our premium Publisher roles are verified manually to ensure only the highest quality packs hit the store.</p>
          </motion.div>

          <motion.div className="feature-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="feature-icon" style={{ color: '#06d6a0' }}><Code size={32} /></div>
            <h3>Developer Friendly</h3>
            <p>Open source and easily extensible. Built by producers, for producers.</p>
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
                <h3>Simple Pricing</h3>
                <p>Free to start, upgrade whenever you outgrow it.</p>
              </div>
              <ArrowRight className="quick-link-arrow" size={20} />
            </Link>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <Link to="/download" className="quick-link-card glass">
              <div className="quick-link-icon" style={{ color: 'var(--accent-secondary)' }}><Download size={28} /></div>
              <div className="quick-link-text">
                <h3>Get the App</h3>
                <p>Windows and macOS builds, system requirements, and setup.</p>
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
          <h2 className="section-title">Frequently Asked <span className="glow-text">Questions</span></h2>
          <p className="faq-subtitle">Everything you need to know before you get started.</p>
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
              <FaqItem q={item.q} a={item.a} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    </>
  );
}
