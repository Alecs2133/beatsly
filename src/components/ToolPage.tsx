import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import './ToolPage.css';

/** Antetul uneltelor de producție (MIDI Deconstructor, Generator AI). */
export const ToolHeader: React.FC<{ title: string; subtitle: string; badge: string }> = ({ title, subtitle, badge }) => (
  <header className="tool-head">
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
    <span className="tool-plan">{badge}</span>
  </header>
);

/** Ce vede un user fără Producer Pack: ce face unealta și drumul spre planuri. */
export const ToolLocked: React.FC<{ title: string; text: string; art: React.ReactNode }> = ({ title, text, art }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <section className="tool-locked">
      <div className="tool-locked-art" aria-hidden>{art}</div>
      <Lock size={22} />
      <h2>{title}</h2>
      <p>{text}</p>
      <button type="button" className="btn-primary-pill" onClick={() => navigate('/store')}>{t('midi_see_plans')}</button>
    </section>
  );
};
