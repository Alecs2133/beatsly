import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { BatchUpload } from '../components/BatchUpload';
import { useTranslation } from '../hooks/useTranslation';
import { SoundItem } from '../data/mockData';
import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

interface RoleRequest {
  id: string;
  user_id: string;
  social_links: string;
  status: string;
  requested_role: string;
  created_at: string;
}

export const Admin: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'requests' | 'batch_upload' | 'moderation'>('requests');
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [pendingSounds, setPendingSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useAppStore();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('role_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load requests', 'error');
    }
  };

  const fetchPendingSounds = async () => {
    try {
      const { data, error } = await supabase
        .from('sounds')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingSounds(data || []);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load pending sounds', 'error');
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchRequests(), fetchPendingSounds()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const handleApprove = async (req: RoleRequest) => {
    try {
      showToast(t('approving'), 'info');
      // Apelăm funcția RPC din baza de date pentru a schimba metadatele
      const { error } = await supabase.rpc('approve_role_request', {
        req_id: req.id,
        req_user_id: req.user_id,
        granted_role: req.requested_role || 'PRODUCER'
      });

      if (error) throw error;
      
      showToast(t('approved_success'), 'success');
      setRequests(requests.filter(r => r.id !== req.id));
    } catch (err: any) {
      console.error(err);
      showToast('Approval failed: ' + err.message, 'error');
    }
  };

  const handleReject = async (req: RoleRequest) => {
    try {
      showToast(t('rejecting'), 'info');
      const { error } = await supabase
        .from('role_requests')
        .update({ status: 'rejected' })
        .eq('id', req.id);

      if (error) throw error;
      
      // Send notification
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        title: 'Role Request Rejected',
        message: `Your application for the ${req.requested_role || 'PRODUCER'} tag was not approved. Please ensure your social links clearly verify your identity and try again later.`,
        type: 'role'
      });
      
      showToast(t('rejected_success'), 'info');
      setRequests(requests.filter(r => r.id !== req.id));
    } catch (err: any) {
      console.error(err);
      showToast('Rejection failed.', 'error');
    }
  };

  const handleApproveSound = async (soundId: string) => {
    try {
      showToast('Approving sound...', 'info');
      const { error } = await supabase
        .from('sounds')
        .update({ status: 'approved' })
        .eq('id', soundId);

      if (error) throw error;
      
      showToast('Sound approved and published!', 'success');
      setPendingSounds(pendingSounds.filter(s => s.id !== soundId));
    } catch (err: any) {
      console.error(err);
      showToast('Approval failed.', 'error');
    }
  };

  const handleRejectSound = async (sound: SoundItem) => {
    try {
      showToast('Rejecting and deleting sound...', 'info');
      
      // Extract filename from URL
      // URL format: https://.../storage/v1/object/public/sounds/filename.wav
      if (sound.file_url) {
        const urlParts = sound.file_url.split('/');
        const fileName = urlParts[urlParts.length - 1];

        if (fileName) {
          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from('sounds')
            .remove([fileName]);
          if (storageError) console.error("Storage delete error:", storageError);
        }
      }

      // Delete from DB
      const { error: dbError } = await supabase
        .from('sounds')
        .delete()
        .eq('id', sound.id);

      if (dbError) throw dbError;
      
      showToast('Sound deleted permanently.', 'info');
      setPendingSounds(pendingSounds.filter(s => s.id !== sound.id));
    } catch (err: any) {
      console.error(err);
      showToast('Rejection failed.', 'error');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '10px' }}>{t('admin_dashboard')}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
        {t('admin_subtitle')}
      </p>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'requests' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: activeTab === 'requests' ? 'black' : 'white', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
        >
          {t('role_requests')}
        </button>
        <button 
          onClick={() => setActiveTab('batch_upload')}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'batch_upload' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: activeTab === 'batch_upload' ? 'black' : 'white', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
        >
          {t('batch_upload_studio')}
        </button>
        <button 
          onClick={() => setActiveTab('moderation')}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'moderation' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: activeTab === 'moderation' ? 'black' : 'white', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
        >
          Sound Moderation ({pendingSounds.length})
        </button>
      </div>

      {activeTab === 'batch_upload' ? (
        <BatchUpload />
      ) : activeTab === 'requests' ? (
        <>
          {loading ? (
            <p>{t('loading_requests')}</p>
          ) : requests.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-panel)', borderRadius: '12px' }}>
              <p style={{ color: 'var(--text-muted)' }}>{t('no_requests')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {requests.map(req => (
                <div key={req.id} style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>{t('user_id')} {req.user_id}</p>
                    <a href={req.social_links} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                      {req.social_links}
                    </a>
                    <p style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 'bold', marginTop: '5px' }}>
                      Role: {req.requested_role || 'PRODUCER'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
                      {t('requested_on')} {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleReject(req)}
                      style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
                    >
                      {t('btn_reject')}
                    </button>
                    <button 
                      onClick={() => handleApprove(req)}
                      style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent-primary)', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Approve as {req.requested_role || 'PRODUCER'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : activeTab === 'moderation' ? (
        <>
          {loading ? (
            <p>Loading pending sounds...</p>
          ) : pendingSounds.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-panel)', borderRadius: '12px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No sounds pending approval.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {pendingSounds.map(sound => {
                const isThisPlaying = currentTrack?.id === sound.id && isPlaying;
                return (
                  <div key={sound.id} style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <button 
                        onClick={() => {
                          if (currentTrack?.id === sound.id) {
                            togglePlay();
                          } else {
                            playTrack(sound);
                          }
                        }}
                        style={{ 
                          width: '40px', height: '40px', borderRadius: '50%', border: 'none', 
                          background: 'var(--accent-primary)', color: 'black', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                        }}
                      >
                        {isThisPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                      </button>
                      <div>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>{sound.title}</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>by {sound.author} • {sound.type.toUpperCase()}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleRejectSound(sound)}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'rgba(255,68,68,0.1)', color: '#ff4444', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Reject & Delete
                      </button>
                      <button 
                        onClick={() => handleApproveSound(sound.id)}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent-primary)', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
