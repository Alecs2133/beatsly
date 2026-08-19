import { Download, Cloud, Sparkles, ShoppingBag, Music, Code, Zap, Shield, Crown, Lock, X, Coins, LogOut, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import { CookieBanner } from './components/CookieBanner';
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

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, startCounting: boolean = false) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const animate = useCallback((timestamp: number) => {
    if (!startTime.current) startTime.current = timestamp;
    const elapsed = timestamp - startTime.current;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    setCount(Math.floor(eased * end));
    if (progress < 1) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [end, duration]);

  useEffect(() => {
    if (!startCounting) return;
    startTime.current = null;
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startCounting, animate]);

  return count;
}

function StatCard({ value, suffix, label, prefix = '' }: { value: number; suffix: string; label: string; prefix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const count = useCountUp(value, 2000, visible);

  return (
    <div ref={ref} className="stat-card">
      <div className="stat-value">{prefix}{count.toLocaleString()}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const TESTIMONIALS = [
  { name: 'Alex M.', role: 'Trap Producer', text: 'Beats.ly completely changed how I organize my samples. The AI generator is insane — I get fresh ideas in seconds instead of hours.', avatar: 'AM' },
  { name: 'Sandra K.', role: 'Sound Designer', text: "The cloud sync is a game changer. I work from two different studios and my entire library is always there. Can't go back to hard drives.", avatar: 'SK' },
  { name: 'DJ Mihai', role: 'DJ & Producer', text: 'Cleanest sample manager I\'ve ever used. The dark UI looks premium and everything just works. The community store is growing fast.', avatar: 'DM' },
];

const FAQS = [
  { q: 'Is Beats.ly really free?', a: 'Yes! The Free tier gives you 3 download credits per day and full access to the local library manager. You can use it forever at no cost.' },
  { q: 'What is a "credit"?', a: 'Credits are used to download sounds from the cloud. Each sound costs 1 credit. Free users get 3 per day. Ultimate members have unlimited downloads with no credit system.' },
  { q: 'How does the AI Generator work?', a: 'You describe the sound you need (e.g. "heavy 808 bass at 140 BPM") and our AI generates a unique, royalty-free audio sample in seconds.' },
  { q: 'What platforms are supported?', a: 'Beats.ly is available for Windows 10/11 (x64) and macOS (Apple Silicon). An Intel Mac build is coming soon.' },
  { q: 'Is my data safe?', a: 'All your data is stored securely on Supabase with Row Level Security. We never share your data with third parties.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item glass ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)}>
      <div className="faq-question">
        <span>{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex', fontSize: '24px', color: 'var(--accent-primary)', fontWeight: 300 }}>+</motion.span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="faq-answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Tag-ul și numele fișierelor sunt derivate din versiunea din package.json.
  // Anterior tag-ul era fix `v0.1.0-beta` în timp ce fișierele purtau 0.1.5,
  // deci link-urile se rupeau la fiecare release nou.
  const RELEASES_BASE = 'https://github.com/Alecs2133/beatsly/releases/download';
  const WIN_URL = `${RELEASES_BASE}/v${__APP_VERSION__}/beatsly_${__APP_VERSION__}_x64-setup.exe`;
  const MAC_URL = `${RELEASES_BASE}/v${__APP_VERSION__}/beatsly_${__APP_VERSION__}_aarch64.dmg`;

  const handleDownload = (url: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="landing-container">
      {/* Floating background orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      
      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'glass scrolled' : 'transparent'}`}>
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
          {user ? (
            <div className="nav-user">
              <UserCircle size={20} />
              <span>{user.email?.split('@')[0]}</span>
              <button onClick={handleSignOut} className="btn-icon" title="Sign Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => setUser({ email: u.email } as User)}
      />

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
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDownload(WIN_URL)}
              className="btn btn-primary"
            >
              <WindowsIcon />
              Download for Windows
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDownload(MAC_URL)}
              className="btn btn-secondary glass-btn"
            >
              <AppleIcon />
              Download for Mac
            </motion.button>
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

      {/* Stats Section */}
      <motion.section
        className="stats-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp}>
          <StatCard value={1200} suffix="+" label="Producers Worldwide" />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard value={50000} suffix="+" label="Sounds in the Cloud" />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard value={4} suffix=".9★" label="Average Rating" prefix="" />
        </motion.div>
        <motion.div variants={fadeInUp}>
          <StatCard value={100} suffix="% Free" label="Forever to Start" />
        </motion.div>
      </motion.section>

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
      {/* Testimonials Section */}
      <section className="testimonials">
        <motion.div
          initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
        >
          <h2 className="section-title">Loved by <span className="glow-text">Producers</span></h2>
        </motion.div>
        <motion.div
          className="testimonials-grid"
          initial="hidden" whileInView="visible"
          viewport={{ once: true }} variants={staggerContainer}
        >
          {TESTIMONIALS.map((t) => (
            <motion.div key={t.name} className="testimonial-card glass" variants={fadeInUp}>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.avatar}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
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

      {/* FAQ Section */}
      <section className="faq-section" style={{ maxWidth: '780px', margin: '0 auto', padding: '80px 24px' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
        >
          <h2 className="section-title">Frequently Asked <span className="glow-text">Questions</span></h2>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '40px' }}
        >
          {FAQS.map((item) => (
            <motion.div key={item.q} variants={fadeInUp}>
              <FaqItem q={item.q} a={item.a} />
            </motion.div>
          ))}
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
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => handleDownload(WIN_URL)}
              className="btn btn-primary btn-large"
            >
              <WindowsIcon />
              Download for Windows
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => handleDownload(MAC_URL)}
              className="btn btn-secondary btn-large glass-btn"
            >
              <AppleIcon />
              Download for Mac
            </motion.button>
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

      <CookieBanner />
    </div>
  );
}

export default App;
