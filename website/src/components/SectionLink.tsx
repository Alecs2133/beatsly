import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Link către o secțiune de pe Home (ex: Features, FAQ). Trimite secțiunea prin
 * `state`, nu ca `/#features`, ca URL-ul să rămână curat — vezi ScrollManager
 * din Layout.
 */
export function SectionLink({ section, className, children }: { section: string; className?: string; children: ReactNode }) {
  return (
    <Link to="/" state={{ section }} className={className}>
      {children}
    </Link>
  );
}
