import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { hasUnlimitedCredits } from '../lib/roles';
import { Search, Settings, X, Plus, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './TopBar.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const TopBar: React.FC = () => {
  const { searchQuery, setSearchQuery } = useAppStore();
  const { user, profile, signOut } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Simple polling for notifications since we are keeping it client side
      // Realtime subscription would be better for production
      const interval = setInterval(fetchNotifications, 30000); // Check every 30s
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!user) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
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
          <span className="search-icon"><Search size={16} /></span>
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
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div />
      )}
      <div className="user-profile">
        {profile && (
          <div className="credits" onClick={() => navigate('/store')} style={{ cursor: 'pointer' }} title="Get more credits">
            <span className="credits-amount">
              {hasUnlimitedCredits(profile.role, profile.tier) ? '∞' : profile.credits}
            </span>
            <span className="credits-label">{t('topbar_credits')}</span>
            <button className="add-credits-btn"><Plus size={16} strokeWidth={3} /></button>
          </div>
        )}
        
        {user && (
          <div className="notifications-container" ref={notificationsRef}>
            <button 
              className="notifications-btn"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setDropdownOpen(false);
              }}
            >
              <Bell size={20} />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="notification-badge">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  {notifications.some(n => !n.is_read) && (
                    <button className="mark-read-btn" onClick={markAllAsRead}>Mark all read</button>
                  )}
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="notification-title">{notif.title}</div>
                        <div className="notification-message">{notif.message}</div>
                        <div className="notification-time">
                          {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="settings-container" ref={dropdownRef}>
          {dropdownOpen && <div className="dropdown-overlay" onClick={() => setDropdownOpen(false)}></div>}
          <button 
            className="settings-btn" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Settings"
          >
            <Settings size={20} />
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
