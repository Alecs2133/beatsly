import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import './LoadingScreen.css';

interface LoadingScreenProps {
  isReady: boolean;
}

/**
 * Ecranul de pornire: stă doar cât se citește sesiunea, apoi se stinge.
 * Fără pași inventați („calibrăm audio…”) — bara e nedeterminată pentru că
 * nu avem un progres real de arătat.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isReady }) => {
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => setShouldRender(false), 320);
    return () => clearTimeout(timer);
  }, [isReady]);

  if (!shouldRender) return null;

  return (
    <div className={`loading-screen${isReady ? ' fade-out' : ''}`} aria-hidden={isReady}>
      <div className="loading-logo-container">
        <div className="loading-logo"><Icon name="logo" size={64} /></div>
        <div className="loading-title">beats<span>.ly</span></div>
      </div>
      <div className="loading-progress-container" role="progressbar" aria-busy="true">
        <div className="loading-progress-bar" />
      </div>
    </div>
  );
};
