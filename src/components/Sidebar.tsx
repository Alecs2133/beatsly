import React, { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { useMyCrews } from '../hooks/useMyCrews';
import { isAdminRole, isPublisherRole, hasUnlimitedCredits } from '../lib/roles';
import { FEATURES } from '../lib/features';
import { Compass, ShieldCheck, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Icon } from './Icon';
import './Sidebar.css';

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-item bi-trigger active' : 'nav-item bi-trigger');

export const Sidebar: React.FC = () => {
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const { crews } = useMyCrews();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLLIElement>(null);
  const role = profile?.role;
  const canPublish = isPublisherRole(role);
  // Un membru pe Free invitat într-un crew Ultimate trebuie să vadă link-ul
  // la fel ca proprietarul — de-aia gating-ul se uită și la `crews.length`,
  // nu doar la tier-ul propriu.
  const showCrew = hasUnlimitedCredits(role, profile?.tier) || crews.length > 0;
  const showAdmin = isAdminRole(role);

  // Indicatorul alunecă elastic sub link-ul activ, în loc ca fundalul să
  // „sară” de la un element la altul.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;
    const active = nav.querySelector<HTMLElement>('.nav-item.active');
    if (!active) {
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';
    indicator.style.height = `${active.offsetHeight}px`;
    indicator.style.transform = `translateY(${active.offsetTop}px)`;
  }, [location.pathname, isCollapsed, canPublish, showCrew, showAdmin]);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="logo">
        <span className="logo-mark bi-trigger" aria-hidden>
          <Icon name="logo" size={30} play={1} />
        </span>
        {!isCollapsed && <h2>beats<span className="accent">.ly</span></h2>}
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={t('sidebar_toggle')}
          aria-label={t('sidebar_toggle')}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="nav-menu">
        <ul ref={navRef} className="nav-list">
          <li ref={indicatorRef} className="nav-indicator" role="presentation" aria-hidden />
          <li>
            <NavLink to="/" className={navClass} title={isCollapsed ? t('nav_discover') : undefined}>
              <span className="nav-icon"><Compass size={19} strokeWidth={1.8} /></span>
              <span className="nav-text">{t('nav_discover')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/library" className={navClass} title={isCollapsed ? t('nav_my_sounds') : undefined}>
              <span className="nav-icon"><Icon name="heart" size={19} /></span>
              <span className="nav-text">{t('nav_my_sounds')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/analyzer" className={navClass} title={isCollapsed ? t('nav_ai_generator') : undefined}>
              <span className="nav-icon"><Icon name="sparkle" size={19} /></span>
              <span className="nav-text">{t('nav_ai_generator')}</span>
              <span className="beta-badge">{FEATURES.aiGenerator ? 'ULTIMATE' : t('coming_soon_short')}</span>
            </NavLink>
          </li>
          {canPublish && (
            <li>
              <NavLink to="/local" className={navClass} title={isCollapsed ? t('nav_local_files') : undefined}>
                <span className="nav-icon"><Icon name="folder" size={19} /></span>
                <span className="nav-text">{t('nav_local_files')}</span>
              </NavLink>
            </li>
          )}
          {showCrew && (
            <li>
              <NavLink to="/crew" className={navClass} title={isCollapsed ? t('nav_crew') : undefined}>
                <span className="nav-icon"><Icon name="crew" size={19} /></span>
                <span className="nav-text">{t('nav_crew')}</span>
              </NavLink>
            </li>
          )}
          {showAdmin && (
            <li>
              <NavLink to="/admin" className={navClass} title={isCollapsed ? t('nav_admin') : undefined}>
                <span className="nav-icon"><ShieldCheck size={19} strokeWidth={1.8} /></span>
                <span className="nav-text">{t('nav_admin')}</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
};
