import React from 'react';
import type { TagPack } from '../lib/packs';
import { useTranslation } from '../hooks/useTranslation';
import './PackCard.css';

// Înălțimile barelor decorative — fixe, ca fiecare card să arate la fel la fiecare randare.
const BARS = [38, 62, 44, 80, 56, 92, 48, 70, 34, 58, 76, 42];

interface PackCardProps {
  pack: TagPack;
  index: number;
  onOpen: (tag: string) => void;
  /** Lățime fixă pentru rândul orizontal din Descoperă; în grilă se întinde. */
  compact?: boolean;
}

export const PackCard: React.FC<PackCardProps> = ({ pack, index, onOpen, compact }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`pack-card stagger-in${compact ? ' compact' : ''}`}
      style={{ '--pack-bg': pack.color, '--i': index } as React.CSSProperties}
      onClick={() => onOpen(pack.tag)}
    >
      <span className="pack-bars" aria-hidden>
        {BARS.map((h, i) => (
          <i key={i} style={{ height: `${h}%`, animationDelay: `${-i * 0.09}s` }} />
        ))}
      </span>
      <span className="pack-title">{pack.title}</span>
      <span className="pack-meta num">
        {t(pack.count === 1 ? 'pack_sounds_one' : 'pack_sounds', { count: pack.count })}
      </span>
    </button>
  );
};
