import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { BatchUpload } from '../components/BatchUpload';
import { ModerationQueue, soundStoragePath } from '../components/admin/ModerationQueue';
import { useTranslation } from '../hooks/useTranslation';
import { SoundItem } from '../types/sound';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { createPreviewMp3, previewObjectName } from '../lib/audioPreview';
import { mapSoundRow } from '../lib/soundRow';
import { fetchAllPages } from '../lib/paging';
import type { Tables } from '../lib/database.types';
import { errorMessage } from '../lib/errors';

type RoleRequest = Tables<'role_requests'>;
type ErrorReport = Tables<'client_error_reports'>;

export const Admin: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'requests' | 'batch_upload' | 'moderation' | 'errors'>('requests');
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [pendingSounds, setPendingSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingPreviews, setMissingPreviews] = useState<number | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [errorReportsLoaded, setErrorReportsLoaded] = useState(false);
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const { showToast } = useAppStore();

  // Lazy — nu are rost să tragem potențial sute de rânduri de fiecare dată
  // când un admin deschide pagina, dacă nu se uită niciodată la tabul ăsta.
  useEffect(() => {
    if (activeTab !== 'errors' || errorReportsLoaded) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('client_error_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        setErrorReports(data || []);
      } catch (err) {
        console.error(err);
        showToast(t('admin_errors_load_failed'), 'error');
      } finally {
        setErrorReportsLoaded(true);
      }
    })();
  }, [activeTab, errorReportsLoaded, showToast, t]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('role_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error(err);
      showToast(t('admin_requests_load_failed'), 'error');
    }
  };

  const fetchPendingSounds = async () => {
    try {
      const { data, error } = await supabase
        .from('sounds')
        .select('*')
        .eq('status', 'pending')
        // Sunetele de crew intră direct cu status 'approved' (vezi migrarea
        // crews), deci filtrul de mai sus le exclude deja — asta e doar o a
        // doua barieră, ca sunetele private să nu ajungă niciodată în coada
        // publică de moderare chiar dacă politica RLS s-ar schimba cumva.
        .is('crew_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingSounds((data || []).map(mapSoundRow));
    } catch (err) {
      console.error(err);
      showToast(t('admin_pending_load_failed'), 'error');
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchRequests(), fetchPendingSounds(), countMissingPreviews()]);
      setLoading(false);
    };
    loadAll();
    // Încărcare unică la montare; funcțiile de fetch sunt recreate la fiecare
    // randare, deci dacă le-am pune aici efectul ar rula în buclă.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (req: RoleRequest) => {
    // Coloana e nullable în schemă; o cerere fără user n-are cui să-i dea rolul.
    if (!req.user_id) return;
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
    } catch (err) {
      console.error(err);
      showToast(`${t('admin_approval_failed')} ${errorMessage(err)}`, 'error');
    }
  };

  const handleReject = async (req: RoleRequest) => {
    if (!req.user_id) return;
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
    } catch (err) {
      console.error(err);
      showToast(t('admin_rejection_failed'), 'error');
    }
  };

  const countMissingPreviews = async () => {
    const { count, error } = await supabase
      .from('sounds')
      .select('id', { count: 'exact', head: true })
      .is('preview_url', null);

    if (error) {
      console.error(error);
      return;
    }
    setMissingPreviews(count ?? 0);
  };

  /**
   * Generează preview-urile lipsă pentru sunetele deja publicate.
   *
   * Funcționează cât timp bucket-ul `sounds` este încă public — de aceea
   * migrarea care îl trece la privat trebuie aplicată abia după ce contorul
   * de mai jos ajunge la zero.
   */
  const handleBackfillPreviews = async () => {
    setBackfilling(true);
    setBackfillProgress({ done: 0, total: 0, failed: 0 });

    try {
      // Lista completă e citită înainte de a modifica vreun rând, deci
      // paginarea nu e afectată de `preview_url` care se completează pe parcurs.
      const pending = await fetchAllPages((from, to) =>
        supabase
          .from('sounds')
          .select('id, title, file_url, storage_path')
          .is('preview_url', null)
          .order('id')
          .range(from, to)
      );
      setBackfillProgress({ done: 0, total: pending.length, failed: 0 });

      if (pending.length === 0) {
        showToast(t('admin_previews_all_done'), 'success');
        return;
      }

      let done = 0;
      let failed = 0;

      for (const row of pending) {
        try {
          const storagePath = soundStoragePath({ storage_path: row.storage_path ?? undefined, file_url: row.file_url ?? undefined });
          if (!storagePath) throw new Error('Lipsește calea în storage');

          // Bucket-ul `sounds` e privat: URL-ul public din `file_url` nu mai
          // răspunde, deci descărcăm originalul printr-un URL semnat.
          const { data: signed, error: signError } = await supabase.storage
            .from('sounds')
            .createSignedUrl(storagePath, 600);
          if (signError || !signed) throw signError ?? new Error('Nu am putut semna URL-ul');

          const response = await tauriFetch(signed.signedUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const preview = await createPreviewMp3(blob);

          const previewPath = previewObjectName(storagePath);
          const { error: uploadError } = await supabase.storage
            .from('sound-previews')
            .upload(previewPath, preview, {
              contentType: 'audio/mpeg',
              upsert: true,
            });
          if (uploadError) throw uploadError;

          const { data: publicUrl } = supabase.storage
            .from('sound-previews')
            .getPublicUrl(previewPath);

          const { error: updateError } = await supabase
            .from('sounds')
            .update({
              preview_url: publicUrl.publicUrl,
              storage_path: storagePath,
            })
            .eq('id', row.id);
          if (updateError) throw updateError;

          done++;
        } catch (err) {
          console.error(`Preview eșuat pentru "${row.title}":`, err);
          failed++;
        }
        setBackfillProgress({ done, total: pending.length, failed });
      }

      showToast(
        failed === 0
          ? t('admin_previews_generated', { done })
          : t('admin_previews_partial', { done, failed }),
        failed === 0 ? 'success' : 'error'
      );
      await countMissingPreviews();
    } catch (err) {
      console.error(err);
      showToast(`${t('admin_backfill_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setBackfilling(false);
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
          {t('admin_tab_moderation', { count: pendingSounds.length })}
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'errors' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: activeTab === 'errors' ? 'black' : 'white', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
        >
          {t('admin_tab_errors')}
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
                      {t('admin_role', { role: req.requested_role || 'PRODUCER' })}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
                      {t('requested_on')} {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
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
                      {t('admin_approve_as', { role: req.requested_role || 'PRODUCER' })}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : activeTab === 'moderation' ? (
        <>
          <div style={{
            background: 'var(--bg-panel)', padding: '20px', borderRadius: '12px',
            border: '1px solid var(--border-light)', marginBottom: '24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px'
          }}>
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>{t('admin_previews_title')}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '620px', lineHeight: 1.5 }}>
                {missingPreviews === null
                  ? t('admin_previews_checking')
                  : missingPreviews === 0
                    ? t('admin_previews_none_missing')
                    : t('admin_previews_missing', { count: missingPreviews })}
              </p>
              {backfilling && backfillProgress.total > 0 && (
                <p style={{ fontSize: '13px', color: 'var(--accent-secondary)', marginTop: '8px' }}>
                  {backfillProgress.done} / {backfillProgress.total}
                  {backfillProgress.failed > 0 && ` · ${t('admin_previews_failed_count', { count: backfillProgress.failed })}`}
                </p>
              )}
            </div>
            <button
              onClick={handleBackfillPreviews}
              disabled={backfilling || missingPreviews === 0}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: backfilling || missingPreviews === 0
                  ? 'rgba(255,255,255,0.08)' : 'var(--accent-primary)',
                color: backfilling || missingPreviews === 0 ? 'var(--text-muted)' : 'black',
                fontWeight: 'bold',
                cursor: backfilling || missingPreviews === 0 ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {backfilling ? t('admin_previews_generating') : t('admin_previews_generate')}
            </button>
          </div>

          {loading ? (
            <p>{t('admin_pending_loading')}</p>
          ) : (
            <ModerationQueue
              sounds={pendingSounds}
              onDone={(ids) => setPendingSounds(prev => prev.filter(s => !ids.includes(s.id)))}
            />
          )}
        </>
      ) : activeTab === 'errors' ? (
        <>
          {!errorReportsLoaded ? (
            <p>{t('common_loading')}</p>
          ) : errorReports.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-panel)', borderRadius: '12px' }}>
              <p style={{ color: 'var(--text-muted)' }}>{t('admin_errors_empty')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {errorReports.map(report => (
                <div key={report.id} style={{ background: 'var(--bg-panel)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpandedErrorId(id => id === report.id ? null : report.id)}
                  >
                    <div>
                      <span style={{
                        fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', marginRight: '10px',
                        background: report.platform === 'desktop' ? 'rgba(124, 92, 255,0.15)' : 'rgba(45, 212, 238,0.15)',
                        color: report.platform === 'desktop' ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                      }}>
                        {report.platform.toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 'bold' }}>{report.context}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: '10px' }}>{report.message}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                      {new Date(report.created_at).toLocaleString()} {report.app_version ? `· v${report.app_version}` : ''}
                    </span>
                  </div>
                  {expandedErrorId === report.id && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {t('admin_report_user', { user: report.user_id || t('admin_anonymous') })}
                      </p>
                      {report.stack && (
                        <pre style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                          {report.stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
