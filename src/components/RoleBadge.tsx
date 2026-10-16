import React, { useId } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKeys } from '../i18n/en';
import './RoleBadge.css';

/** Ce scrie în tooltip pentru fiecare rol verificat. USER nu primește badge. */
const ROLE_LABEL: Record<string, TranslationKeys> = {
  PRODUCER: 'role_producer',
  'VIDEO MAKER': 'role_video_maker',
  EDITOR: 'role_editor',
  'SOUND ENGINEER': 'role_sound_engineer',
  ARTIST: 'role_artist',
  'PRODUCER ADMIN': 'role_admin',
  OWNER: 'role_owner',
};

export const hasRoleBadge = (role?: string | null) => !!role && role in ROLE_LABEL;

// Sigiliul: 12 colțuri rotunjite, ca o ștampilă — același contur pentru toți,
// doar culoarea și semnul din mijloc diferă.
const SEAL = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const r = i % 2 === 0 ? 11 : 9.4;
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
})();

interface RoleBadgeProps {
  role?: string | null;
  size?: number;
}

/**
 * Bifa de verificare de lângă nume. Rolurile acordate de admini (Producător,
 * Artist, Editor…) primesc sigiliul violet; OWNER-ul are unul auriu, cu
 * coroană și o lumină care trece peste el — există unul singur.
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 22 }) => {
  const { t } = useTranslation();
  // useId întoarce „:r1:” — două puncte nu merg într-un url(#…), le scoatem.
  const gradId = `rb-gold-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (!role || !(role in ROLE_LABEL)) return null;

  const owner = role === 'OWNER';
  const label = t(ROLE_LABEL[role]);

  return (
    <span className={`role-badge${owner ? ' owner' : ''}`} title={label} aria-label={label} role="img">
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        {owner && (
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffe7a3" />
              <stop offset="0.5" stopColor="#f2b84b" />
              <stop offset="1" stopColor="#c9822a" />
            </linearGradient>
          </defs>
        )}
        <path className="rb-seal" d={SEAL} style={owner ? { fill: `url(#${gradId})` } : undefined} />
        {owner ? (
          // coroană
          <path className="rb-mark" d="M7 15.5h10l1-6.5-3.2 2.6L12 7l-2.8 4.6L6 9z" />
        ) : (
          <path className="rb-check" d="M8 12.3l2.7 2.7L16.2 9.5" />
        )}
      </svg>
      {owner && <span className="rb-shine" aria-hidden />}
    </span>
  );
};
