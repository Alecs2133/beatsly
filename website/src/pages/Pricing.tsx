import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coins, Crown, Sparkles, Cloud, Lock, X, Check, ArrowRight } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { FaqItem } from '../components/FaqItem';
import { findFaq } from '../data/faqs';

const creditsFaq = findFaq('credits');

export function Pricing() {
  return (
    <>
      {/* Page intro */}
      <header className="page-intro">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 className="page-title" variants={fadeInUp}>
            Simple <span className="glow-text">Pricing</span>
          </motion.h1>
          <motion.p className="page-subtitle" variants={fadeInUp}>
            Choose the plan that fits your workflow. Start free, upgrade whenever you need more.
          </motion.p>
        </motion.div>
      </header>

      {/* Pricing cards */}
      <section className="pricing">
        <motion.div
          className="pricing-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {/* Free Tier */}
          <motion.div className="pricing-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
            <div className="pricing-header">
              <h3>Free</h3>
              <div className="price">$0<span>/month</span></div>
            </div>
            <ul className="pricing-features">
              <li><Coins size={16} /> 3 credits / day</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> AI Generator Tool</li>
              <li style={{ opacity: 0.5 }}><X size={16} /> Cloud Uploading</li>
            </ul>
            <Link to="/download" className="btn btn-secondary pricing-btn">Get Started</Link>
          </motion.div>

          {/* Producer Pack */}
          <motion.div className="pricing-card glass" variants={fadeInUp} whileHover={{ y: -8 }}>
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

      {/* Comparison table */}
      <section className="compare-section">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
        >
          <h2 className="section-title">Compare <span className="glow-text">Plans</span></h2>
        </motion.div>

        {/* Vizibil doar sub breakpoint-ul mobil (via CSS) — tabelul rămâne cu
            scroll orizontal pe ecrane înguste, deci indicăm asta explicit. */}
        <p className="compare-hint">Swipe to compare →</p>

        <motion.div
          className="compare-table glass"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeInUp}
        >
          <div className="compare-row compare-head">
            <div className="compare-feature"></div>
            <div>Free</div>
            <div>Producer</div>
            <div className="compare-highlight">Ultimate</div>
          </div>
          <div className="compare-row">
            <div className="compare-feature">Download credits</div>
            <div>3 / day</div>
            <div>30 / day</div>
            <div className="compare-highlight">Unlimited</div>
          </div>
          <div className="compare-row">
            <div className="compare-feature">AI Generator</div>
            <div><X size={16} className="compare-no" /></div>
            <div><X size={16} className="compare-no" /></div>
            <div className="compare-highlight"><Check size={16} className="compare-yes" /></div>
          </div>
          <div className="compare-row">
            <div className="compare-feature">Cloud uploading</div>
            <div><X size={16} className="compare-no" /></div>
            <div><X size={16} className="compare-no" /></div>
            <div className="compare-highlight"><Check size={16} className="compare-yes" /></div>
          </div>
          <div className="compare-row">
            <div className="compare-feature">Local library manager</div>
            <div><Check size={16} className="compare-yes" /></div>
            <div><Check size={16} className="compare-yes" /></div>
            <div className="compare-highlight"><Check size={16} className="compare-yes" /></div>
          </div>
        </motion.div>
      </section>

      {/* Mini FAQ relevant to billing */}
      <section className="pricing-faq">
        <motion.div
          className="pricing-faq-inner"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeInUp}
        >
          <FaqItem q={creditsFaq.q} a={creditsFaq.a} />
          <Link to="/#faq" className="see-all-faq">
            See all questions <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* Closing CTA */}
      <section className="pricing-cta">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeInUp}
        >
          <h2>Not sure yet?</h2>
          <p>The Free tier is free forever — no card required to try it out.</p>
          <Link to="/download" className="btn btn-primary btn-large">
            Download Beats.ly
          </Link>
        </motion.div>
      </section>
    </>
  );
}
