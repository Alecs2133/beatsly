import React, { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import './LoadingScreen.css';

interface LoadingScreenProps {
  isReady: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isReady }) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState(t('init_engine'));
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (isReady) {
      setProgress(100);
      setStatusText(t('ready_beats'));
      
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 600); // Wait for fade out animation
      
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  useEffect(() => {
    if (!isReady) {
      // Simulate loading progress steps
      const steps = [
        { p: 20, text: t('connecting_cloud') },
        { p: 45, text: t('calibrating_audio') },
        { p: 70, text: t('fetching_libraries') },
        { p: 90, text: t('warming_speakers') }
      ];
      
      let stepIndex = 0;
      
      const interval = setInterval(() => {
        if (stepIndex < steps.length) {
          setProgress(steps[stepIndex].p);
          setStatusText(steps[stepIndex].text);
          stepIndex++;
        }
      }, 600);
      
      return () => clearInterval(interval);
    }
  }, [isReady]);

  if (!shouldRender) return null;

  return (
    <div className={`loading-screen ${isReady ? 'fade-out' : ''}`}>
      <div className="loading-logo-container">
        <div className="loading-logo">🎹</div>
        <div className="loading-title">Beats.ly</div>
      </div>
      
      <div className="loading-progress-container">
        <div 
          className="loading-progress-bar" 
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="loading-text">
        {statusText}
      </div>
    </div>
  );
};
