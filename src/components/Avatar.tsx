import React, { useState } from 'react';
import { avatarUrl } from '../lib/profile';
import './Avatar.css';

interface AvatarProps {
  path?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

/** Nuanță stabilă din nume — fiecare om are culoarea lui, nu toți același violet. */
function nameHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

/** Poza de profil, sau inițiala numelui pe culoarea lui dacă nu există poză (ori nu se încarcă). */
export const Avatar: React.FC<AvatarProps> = ({ path, name, size = 32, className }) => {
  const url = avatarUrl(path);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();

  return (
    <span
      className={`avatar${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), '--ah': nameHue(name?.trim() || '?') } as React.CSSProperties}
      aria-hidden
    >
      {url && failedUrl !== url ? (
        <img src={url} alt="" draggable={false} onError={() => setFailedUrl(url)} />
      ) : (
        initial
      )}
    </span>
  );
};
