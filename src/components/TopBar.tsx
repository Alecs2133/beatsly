import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import './TopBar.css';

export const TopBar: React.FC = () => {
  const { searchQuery, setSearchQuery } = useAppStore();
  const { user, profile, signOut } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };
  
  const showSearch = location.pathname === '/' || location.pathname === '/library';
  
  return (
    <header className="topbar glass">
      {showSearch ? (
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            className="search-input" 
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="search-clear-btn" 
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <div />
      )}
      <div className="user-profile">
        {profile && (
          <div className="credits">
            <span className="credits-amount">
              {(profile.tier === 'ultimate' || user?.user_metadata?.role === 'OWNER') ? '∞' : profile.credits}
            </span>
            <span className="credits-label">{t('topbar_credits')}</span>
          </div>
        )}
        
        <div className="settings-container" ref={dropdownRef}>
          {dropdownOpen && <div className="dropdown-overlay" onClick={() => setDropdownOpen(false)}></div>}
          <button 
            className="settings-btn" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Settings"
          >
            ⚙️
          </button>
          
          {dropdownOpen && (
            <div className="settings-dropdown glass">
              <div 
                className="dropdown-section hoverable" 
                onClick={() => {
                  if (user) {
                    navigate('/account');
                    setDropdownOpen(false);
                  }
                }}
              >
                <span className="dropdown-label">{t('topbar_account')}</span>
                {user ? (
                  <span className="dropdown-value">{profile?.username || user.email}</span>
                ) : (
                  <span className="dropdown-value text-muted">{t('topbar_guest')}</span>
                )}
              </div>
              
              <div 
                className="dropdown-section hoverable"
                onClick={() => {
                  navigate('/options');
                  setDropdownOpen(false);
                }}
              >
                <span className="dropdown-label">{t('topbar_options')}</span>
                <span className="dropdown-value">Preferences</span>
              </div>
              
              <div className="dropdown-divider"></div>
              
              {user ? (
                <button 
                  className="dropdown-action-btn logout-btn"
                  onClick={() => {
                    handleLogout();
                    setDropdownOpen(false);
                  }}
                >
                  {t('topbar_logout')}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 12px 12px 12px' }}>
                  <button 
                    className="dropdown-action-btn login-btn"
                    onClick={() => {
                      navigate('/auth');
                      setDropdownOpen(false);
                    }}
                  >
                    {t('topbar_login')}
                  </button>
                  <button 
                    className="dropdown-action-btn signup-btn"
                    onClick={() => {
                      navigate('/auth');
                      setDropdownOpen(false);
                    }}
                  >
                    {t('topbar_signup')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
