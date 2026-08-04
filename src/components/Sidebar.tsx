import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { session } = useAuthStore();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const role = session?.user?.user_metadata?.role;
  const canPublish = role === 'PRODUCER' || role === 'VIDEO MAKER' || role === 'PRODUCER ADMIN';

  return (
    <aside className={`sidebar glass ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', width: '100%' }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="logo-icon">🎵</span>
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
                <span className="nav-icon">🎧</span>
                <span className="nav-text">{t('nav_discover')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/library" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">📁</span>
                <span className="nav-text">{t('nav_my_sounds')}</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/analyzer" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">🤖</span>
                <span className="nav-text">{t('nav_ai_generator')}</span>
                <span className="beta-badge">ULTIMATE</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/store" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                <span className="nav-icon">💎</span>
                <span className="nav-text">{t('nav_store')}</span>
              </NavLink>
            </li>
            {canPublish && (
              <li>
                <NavLink to="/local" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                  <span className="nav-icon">📂</span>
                  <span className="nav-text">{t('nav_local_files')}</span>
                </NavLink>
              </li>
            )}
            {(role === 'PRODUCER ADMIN' || role === 'OWNER') && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                  <span className="nav-icon">⚙️</span>
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
