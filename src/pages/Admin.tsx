import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { BatchUpload } from '../components/BatchUpload';
import { useTranslation } from '../hooks/useTranslation';

interface RoleRequest {
  id: string;
  user_id: string;
  social_links: string;
  status: string;
  created_at: string;
}

export const Admin: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'requests' | 'batch_upload'>('requests');
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useAppStore();

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (req: RoleRequest) => {
    try {
      showToast(t('approving'), 'info');
      // Apelăm funcția RPC din baza de date pentru a schimba metadatele
      const { error } = await supabase.rpc('approve_producer_request', {
        req_id: req.id,
        req_user_id: req.user_id
      });

      if (error) throw error;
      
      showToast(t('approved_success'), 'success');
      setRequests(requests.filter(r => r.id !== req.id));
    } catch (err: any) {
      console.error(err);
      showToast('Approval failed: ' + err.message, 'error');
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      showToast(t('rejecting'), 'info');
      const { error } = await supabase
        .from('role_requests')
        .update({ status: 'rejected' })
        .eq('id', reqId);

      if (error) throw error;
      
      showToast(t('rejected_success'), 'info');
      setRequests(requests.filter(r => r.id !== reqId));
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
      </div>

      {activeTab === 'batch_upload' ? (
        <BatchUpload />
      ) : (
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
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
                      {t('requested_on')} {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleReject(req.id)}
                      style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
                    >
                      {t('btn_reject')}
                    </button>
                    <button 
                      onClick={() => handleApprove(req)}
                      style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent-primary)', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {t('btn_approve_producer')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
