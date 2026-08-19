import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { isAdminRole, isPublisherRole } from '../lib/roles';
import { Headphones, Library, Bot, HardDrive, Settings } from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const role = profile?.role;
  const canPublish = isPublisherRole(role);

  return (
    <aside className={`sidebar glass ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', width: '100%' }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="logo-icon"><Headphones size={28} color="var(--accent-primary)" /></span>
            <h2>Beats<span className="accent">.ly</span></h2>
          </div>
        )}
        <button 
          className="hamburger-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title="Toggle Sidebar"
        >
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
        </button>
      </div>

      <nav className="nav-menu">
        <nav className="sidebar-nav">
          <ul>
            <li>
              <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon"><Headphones size={20} /></span>
                <span className="nav-text">{t('nav_discover')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/library" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon"><Library size={20} /></span>
                <span className="nav-text">{t('nav_my_sounds')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/analyzer" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon"><Bot size={20} /></span>
                <span className="nav-text">{t('nav_ai_generator')}</span>
                <span className="beta-badge">ULTIMATE</span>
              </NavLink>
            </li>

            {canPublish && (
              <li>
                <NavLink to="/local" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                  <span className="nav-icon"><HardDrive size={20} /></span>
                  <span className="nav-text">{t('nav_local_files')}</span>
                </NavLink>
              </li>
            )}
            {isAdminRole(role) && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                  <span className="nav-icon"><Settings size={20} /></span>
                  <span className="nav-text">{t('nav_admin')}</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </nav>
    </aside>
  );
};
