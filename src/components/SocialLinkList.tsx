import React from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { Globe, Camera, Video, Cloud, Music2 } from 'lucide-react';
import type { SocialKey, SocialLinks } from '../lib/socialLinks';

const ICONS: Record<SocialKey, React.ElementType> = {
  website: Globe,
  instagram: Camera,
  youtube: Video,
  soundcloud: Cloud,
  spotify: Music2,
};

const LABELS: Record<SocialKey, string> = {
  website: 'Website',
  instagram: 'Instagram',
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
};

/**
 * Link-urile publice ale unui profil. Se deschid în browserul sistemului, nu
 * în fereastra aplicației. URL-urile sunt deja validate (doar http/https) de
 * `readSocialLinks`.
 */
export const SocialLinkList: React.FC<{ links: SocialLinks }> = ({ links }) => {
  const entries = (Object.keys(LABELS) as SocialKey[]).filter(k => links[k]);
  if (entries.length === 0) return null;

  return (
    <div className="social-links">
      {entries.map(key => {
        const Icon = ICONS[key];
        const url = links[key]!;
        return (
          <button
            key={key}
            className="social-link"
            title={url}
            onClick={() => open(url).catch(err => console.error('Failed to open link:', err))}
          >
            <Icon size={15} /> {LABELS[key]}
          </button>
        );
      })}
    </div>
  );
};
