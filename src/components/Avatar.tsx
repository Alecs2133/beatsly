import React, { useState } from 'react';
import { avatarUrl } from '../lib/profile';
import './Avatar.css';

interface AvatarProps {
  path?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

/** Poza de profil, sau inițiala numelui pe gradient dacă nu există poză (ori nu se încarcă). */
export const Avatar: React.FC<AvatarProps> = ({ path, name, size = 32, className }) => {
  const url = avatarUrl(path);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();

  return (
    <span
      className={`avatar${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
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
