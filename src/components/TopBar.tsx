import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { hasUnlimitedCredits } from '../lib/roles';
import { Search, X } from 'lucide-react';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';
import { profileName } from '../lib/social';
import { Avatar } from './Avatar';
import type { Tables } from '../lib/database.types';
import './TopBar.css';

type Notification = Tables<'notifications'>;

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

/**
 * Bara de sus: logo, căutarea (deschide paleta Ctrl+K), credite, notificări
 * și poza de profil. Navigarea stă în dock-ul de jos.
 */
export const TopBar: React.FC = () => {
  const { searchQuery, setSearchQuery, setCommandOpen } = useAppStore();
  const { user, profile } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Crește la fiecare notificare nouă → clopoțelul se leagănă.
  const [bellTick, setBellTick] = useState(0);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setNotifications(data); });

    // Notificările noi vin prin Realtime (vezi migrarea notifications_realtime).
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20));
          setBellTick(n => n + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <header className="topbar">
      <button type="button" className="tb-logo" onClick={() => navigate('/')} aria-label="Beats.ly">
        <Icon name="logo" size={28} />
        <span>beats<em>.ly</em></span>
      </button>

      <div className={`tb-search${searchQuery ? ' has-query' : ''}`}>
        <button type="button" className="tb-search-btn" onClick={() => setCommandOpen(true)}>
          <Search size={15} />
          <span className="tb-search-text">{searchQuery ? `„${searchQuery}”` : t('search_placeholder')}</span>
          <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        {searchQuery && (
          <button type="button" className="tb-search-clear" onClick={() => setSearchQuery('')} title={t('search_clear')} aria-label={t('search_clear')}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="tb-right">
        {profile && (
          <button type="button" className="tb-credits" onClick={() => navigate('/store')} title={t('credits_get_more')}>
            <i aria-hidden />
            <span className="credits-amount roll num" key={hasUnlimitedCredits(profile.role, profile.tier) ? 'inf' : profile.credits}>
              {hasUnlimitedCredits(profile.role, profile.tier) ? '∞' : profile.credits}
            </span>
            <span className="tb-credits-label">{t('topbar_credits')}</span>
          </button>
        )}

        {user && (
          <div className="notifications-container" ref={notificationsRef}>
            <button
              type="button"
              className="tb-round bi-trigger"
              onClick={() => setNotificationsOpen(o => !o)}
              aria-label={t('notifications_title')}
            >
              <Icon name="bell" size={18} play={bellTick} />
              {unread > 0 && <span className="notification-badge">{unread}</span>}
            </button>

            {notificationsOpen && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>{t('notifications_title')}</h3>
                  {unread > 0 && (
                    <button className="mark-read-btn" onClick={markAllAsRead}>{t('notifications_mark_read')}</button>
                  )}
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="notifications-empty">{t('notifications_empty')}</div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="notification-title">{notif.title}</div>
                        <div className="notification-message">{notif.message}</div>
                        {notif.created_at && (
                          <div className="notification-time">
                            {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {user && profile ? (
          <button
            className={`profile-btn${location.pathname === '/account' ? ' active' : ''}`}
            onClick={() => navigate('/account')}
            title={t('topbar_profile')}
            aria-label={t('topbar_profile')}
          >
            <Avatar path={profile.avatar_path} name={profileName(profile) || user.email} size={34} />
          </button>
        ) : (
          <button type="button" className="tb-signin" onClick={() => navigate('/auth')}>
            {t('topbar_login')}
          </button>
        )}
      </div>
    </header>
  );
};
