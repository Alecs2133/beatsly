import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import './Account.css';

export const Account: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuthStore();
  const { showToast } = useAppStore();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Profile Form State
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    phone_number: ''
  });

  // Password Form State
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone_number: profile.phone_number || ''
      });
    }
  }, [profile]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local store profile
      if (profile) {
        setProfile({
          ...profile,
          ...formData
        });
      }

      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async () => {
    if (!passwords.newPassword || !passwords.confirmPassword) {
      showToast('Please enter both password fields', 'error');
      return;
    }
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('Passwords do not match!', 'error');
      return;
    }

    if (passwords.newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      if (error) throw error;

      showToast('Password updated successfully!', 'success');
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast(err.message || 'Error updating password', 'error');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="account-page" style={{ flex: 1 }}>
      <div className="account-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{t('account_settings')}</h1>
          <p>{t('account_desc')}</p>
        </div>
        <button 
          className="options-close-btn" 
          onClick={() => navigate(-1)} 
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="account-section glass">
        <h2 className="section-title"><span>👤</span> {t('personal_info')}</h2>
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">{t('email_address')}</label>
            <input 
              type="text" 
              className="form-input" 
              value={user?.email || ''} 
              disabled 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">{t('username')}</label>
            <input 
              type="text" 
              className="form-input" 
              name="username"
              value={formData.username}
              onChange={handleProfileChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('first_name')}</label>
            <input 
              type="text" 
              className="form-input" 
              name="first_name"
              value={formData.first_name}
              onChange={handleProfileChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('last_name')}</label>
            <input 
              type="text" 
              className="form-input" 
              name="last_name"
              value={formData.last_name}
              onChange={handleProfileChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('phone_number')}</label>
            <input 
              type="text" 
              className="form-input" 
              name="phone_number"
              value={formData.phone_number}
              onChange={handleProfileChange}
            />
          </div>
        </div>

        <button 
          className="save-btn" 
          onClick={saveProfile}
          disabled={isLoading}
        >
          {isLoading ? t('saving') : `💾 ${t('save_profile')}`}
        </button>
      </div>

      <div className="account-section glass">
        <h2 className="section-title"><span>🔒</span> {t('security')}</h2>
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">{t('new_password')}</label>
            <input 
              type="password" 
              className="form-input" 
              name="newPassword"
              value={passwords.newPassword}
              onChange={handlePasswordChange}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">{t('confirm_password')}</label>
            <input 
              type="password" 
              className="form-input" 
              name="confirmPassword"
              value={passwords.confirmPassword}
              onChange={handlePasswordChange}
            />
          </div>
        </div>

        <button 
          className="save-btn" 
          onClick={updatePassword}
          disabled={isPasswordLoading}
        >
          {isPasswordLoading ? t('updating') : `🔐 ${t('update_password')}`}
        </button>
      </div>
    </div>
  );
};
