import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Compass, Library, Sparkles, Music2, ArrowRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WelcomeTourProps {
  userId: string;
  onDone: () => void;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: <Compass size={32} />,
    title: 'Welcome to Beats.ly',
    body: 'Discover is your home base — browse loops, one-shots and FX from producers around the world, filtered by BPM, key, or harmonic compatibility.',
  },
  {
    icon: <Library size={32} />,
    title: 'My Sounds & Collections',
    body: 'Save anything you like with the heart icon, then organize your saves into named Collections — a folder next to any sound, so hundreds of downloads stay easy to navigate.',
  },
  {
    icon: <Sparkles size={32} />,
    title: 'As you grow',
    body: 'Ultimate members get the AI Generator and can create private Crews to share sounds with a team. Producers can publish local files straight to the cloud from Local Files.',
  },
  {
    icon: <Music2 size={32} />,
    title: 'Built for production',
    body: 'Drag any local sound straight into your DAW, queue up a whole page with shuffle/repeat, or click anywhere on the waveform to seek. Let\'s make something.',
  },
];

export const WelcomeTour: React.FC<WelcomeTourProps> = ({ userId, onDone }) => {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  const finish = async () => {
    onDone();
    try {
      await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', userId);
    } catch (err) {
      console.error('Failed to mark onboarding complete:', err);
    }
  };

  const current = STEPS[step];

  const content = (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000,
      padding: 20,
    }}>
      <div className="glass" style={{
        width: 460, maxWidth: '100%', borderRadius: 20, padding: 36,
        position: 'relative', textAlign: 'center',
        animation: 'pageFadeIn 0.3s ease-out forwards',
      }}>
        <button
          onClick={finish}
          style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          title="Skip"
        >
          <X size={20} />
        </button>

        <div style={{
          width: 64, height: 64, margin: '0 auto 20px', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--gradient-primary)', color: 'white', boxShadow: 'var(--shadow-glow)',
        }}>
          {current.icon}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{current.title}</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>{current.body}</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 20 : 6, height: 6, borderRadius: 3,
                background: i === step ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => isLast ? finish() : setStep(s => s + 1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
            background: 'var(--gradient-primary)', color: 'white', border: 'none',
            padding: '12px 28px', borderRadius: 24, fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          {isLast ? "Let's go" : 'Next'} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
