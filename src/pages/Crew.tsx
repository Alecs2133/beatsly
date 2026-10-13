import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Users, Plus, Trash2, UploadCloud, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAllPages } from '../lib/paging';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { useMyCrews } from '../hooks/useMyCrews';
import { CrewMember, fetchCrewMembers, createCrew, addCrewMember, removeCrewMember } from '../lib/crews';
import { uploadSoundWithPreview } from '../lib/soundUpload';
import { hasUnlimitedCredits } from '../lib/roles';
import { LICENSE_OPTIONS, SoundLicense } from '../lib/licenses';
import { SoundGrid } from '../components/SoundGrid';
import { SoundItem } from '../types/sound';
import { mapSoundRow } from '../lib/soundRow';
import { errorMessage } from '../lib/errors';
import { useTranslation } from '../hooks/useTranslation';
import { Icon } from '../components/Icon';
import { SoundGridSkeleton } from '../components/SoundGridSkeleton';

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-strong)',
  background: 'rgba(0,0,0,0.3)',
  color: 'var(--text-main)',
  fontSize: 13,
};

export const CrewPage: React.FC = () => {
  const { profile, user } = useAuthStore();
  const { showToast } = useAppStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { crews, loading: crewsLoading, refetch: refetchCrews } = useMyCrews();

  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loadingSounds, setLoadingSounds] = useState(false);

  const [newCrewName, setNewCrewName] = useState('');
  const [creatingCrew, setCreatingCrew] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadBpm, setUploadBpm] = useState('');
  const [uploadKey, setUploadKey] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadLicense, setUploadLicense] = useState<SoundLicense>('royalty_free');
  const [uploadPath, setUploadPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Aceeași regulă ca peste tot în aplicație: OWNER e tratat ca superset al
  // Ultimate (vezi src/lib/roles.ts) — verificarea reală, care contează, e
  // în create_crew() pe server; asta doar decide ce arătăm în UI.
  const canCreateCrew = hasUnlimitedCredits(profile?.role, profile?.tier);

  // Selectează primul crew automat, o dată ce lista sosește.
  useEffect(() => {
    if (!selectedCrewId && crews.length > 0) {
      setSelectedCrewId(crews[0].id);
    }
  }, [crews, selectedCrewId]);

  const selectedCrew = crews.find(c => c.id === selectedCrewId) ?? null;
  const isOwner = !!selectedCrew && selectedCrew.owner_id === user?.id;

  const loadCrewData = useCallback(async (crewId: string) => {
    setLoadingSounds(true);
    try {
      const [membersData, soundRows] = await Promise.all([
        fetchCrewMembers(crewId),
        fetchAllPages((from, to) =>
          supabase
            .from('sounds')
            .select('*')
            .eq('crew_id', crewId)
            .order('created_at', { ascending: false })
            .order('id')
            .range(from, to)
        ),
      ]);
      setMembers(membersData);
      setSounds(soundRows.map(mapSoundRow));
    } catch (err) {
      console.error('Failed to load crew data:', err);
      showToast(`${t('crew_load_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setLoadingSounds(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    if (selectedCrewId) loadCrewData(selectedCrewId);
  }, [selectedCrewId, loadCrewData]);

  const handleCreateCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrewName.trim()) return;
    setCreatingCrew(true);
    try {
      const crew = await createCrew(newCrewName.trim());
      showToast(t('crew_created', { name: crew.name }), 'success');
      setNewCrewName('');
      await refetchCrews();
      setSelectedCrewId(crew.id);
    } catch (err) {
      showToast(`${t('crew_create_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setCreatingCrew(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrewId || !newMemberUsername.trim()) return;
    setAddingMember(true);
    try {
      await addCrewMember(selectedCrewId, newMemberUsername.trim());
      showToast(t('crew_member_added'), 'success');
      setNewMemberUsername('');
      setMembers(await fetchCrewMembers(selectedCrewId));
    } catch (err) {
      showToast(`${t('crew_add_member_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedCrewId) return;
    if (!window.confirm(t('crew_remove_confirm'))) return;
    try {
      await removeCrewMember(selectedCrewId, userId);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      showToast(t('crew_member_removed'), 'info');
    } catch (err) {
      showToast(`${t('crew_remove_failed')} ${errorMessage(err)}`, 'error');
    }
  };

  const handleSelectFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3'] }],
    });
    if (selected && typeof selected === 'string') {
      setUploadPath(selected);
      const name = selected.split(/[\\/]/).pop() || '';
      setUploadTitle(name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrewId || !uploadPath || !user) return;
    setUploading(true);
    try {
      const response = await fetch(convertFileSrc(uploadPath));
      const blob = await response.blob();

      const uploaded = await uploadSoundWithPreview(blob, uploadTitle || 'Untitled', user.id);

      const { error } = await supabase.from('sounds').insert({
        title: uploadTitle || 'Untitled',
        author: profile?.username || 'Crew member',
        bpm: uploadBpm ? Number(uploadBpm) : null,
        key_signature: uploadKey || null,
        tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
        duration: '0:00',
        type: 'loop',
        owner_id: user.id,
        crew_id: selectedCrewId,
        storage_path: uploaded.storagePath,
        preview_url: uploaded.previewUrl,
        file_url: uploaded.legacyPublicUrl,
        status: 'approved',
        license: uploadLicense,
      });
      if (error) throw error;

      showToast(t('crew_shared'), 'success');
      setUploadPath(null);
      setUploadTitle('');
      setUploadBpm('');
      setUploadKey('');
      setUploadTags('');
      setUploadLicense('royalty_free');
      await loadCrewData(selectedCrewId);
    } catch (err) {
      console.error(err);
      showToast(`${t('crew_upload_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  if (crewsLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common_loading')}</div>;
  }

  if (crews.length === 0) {
    return (
      <div className="library-page glass" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '16px', margin: '40px auto', maxWidth: '600px' }}>
        <div className="empty-icon"><Icon name="crew" size={26} play={1} /></div>
        <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>{t('crew_none_title')}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          {canCreateCrew
            ? t('crew_none_can_create')
            : t('crew_none_cannot_create')}
        </p>
        {canCreateCrew ? (
          <form onSubmit={handleCreateCrew} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <input
              value={newCrewName}
              onChange={e => setNewCrewName(e.target.value)}
              placeholder={t('crew_name_placeholder')}
              style={{ ...inputStyle, padding: '12px 16px', fontSize: 14 }}
            />
            <button
              type="submit"
              disabled={creatingCrew || !newCrewName.trim()}
              style={{ background: 'var(--gradient-primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
            >
              {creatingCrew ? t('crew_creating') : t('crew_create')}
            </button>
          </form>
        ) : (
          <button
            onClick={() => navigate('/store')}
            style={{ background: 'var(--gradient-primary)', color: 'white', border: 'none', padding: '12px 32px', borderRadius: 24, fontWeight: 'bold', cursor: 'pointer' }}
          >
            {t('crew_upgrade')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="library-page">
      <div className="page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{t('crew_title')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('crew_subtitle')}</p>
        </div>
        {canCreateCrew && (
          <form onSubmit={handleCreateCrew} style={{ display: 'flex', gap: 8 }}>
            <input
              value={newCrewName}
              onChange={e => setNewCrewName(e.target.value)}
              placeholder={t('crew_new_name_placeholder')}
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={creatingCrew || !newCrewName.trim()}
              style={{ background: 'var(--gradient-primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> {t('crew_new')}
            </button>
          </form>
        )}
      </div>

      {crews.length > 1 && (
        <div className="filter-container">
          {crews.map(c => (
            <button
              key={c.id}
              className={`filter-btn ${selectedCrewId === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCrewId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {selectedCrew && (
        <>
          <div className="glass" style={{ padding: 20, borderRadius: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Users size={18} color="var(--accent-secondary)" />
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t('crew_members', { count: members.length })}</h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: isOwner ? 16 : 0 }}>
              {members.map(m => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 20, fontSize: 13 }}>
                  {m.is_owner && <Crown size={12} color="#ffb703" />}
                  <span>{m.username || t('crew_unknown_member')}</span>
                  {isOwner && !m.is_owner && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                      title={t('crew_remove')}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isOwner && (
              <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newMemberUsername}
                  onChange={e => setNewMemberUsername(e.target.value)}
                  placeholder={t('crew_add_placeholder')}
                  style={{ ...inputStyle, flex: 1, maxWidth: 240 }}
                />
                <button
                  type="submit"
                  disabled={addingMember || !newMemberUsername.trim()}
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-main)', border: '1px solid var(--border-strong)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                >
                  {addingMember ? t('crew_adding') : t('crew_add')}
                </button>
              </form>
            )}
          </div>

          <div className="glass" style={{ padding: 20, borderRadius: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <UploadCloud size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t('crew_share_title')}</h3>
            </div>
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                onClick={handleSelectFile}
                style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border-strong)', color: 'var(--text-main)', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
              >
                {uploadPath ? uploadPath.split(/[\\/]/).pop() : t('crew_select_file')}
              </button>
              {uploadPath && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder={t('title_label')} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                  <input value={uploadBpm} onChange={e => setUploadBpm(e.target.value)} placeholder="BPM" type="number" style={{ ...inputStyle, width: 80 }} />
                  <input value={uploadKey} onChange={e => setUploadKey(e.target.value)} placeholder={t('grid_key')} style={{ ...inputStyle, width: 80 }} />
                  <input value={uploadTags} onChange={e => setUploadTags(e.target.value)} placeholder={t('tags_placeholder')} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                  <select
                    value={uploadLicense}
                    onChange={e => setUploadLicense(e.target.value as SoundLicense)}
                    style={{ ...inputStyle, width: 160 }}
                  >
                    {LICENSE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={uploading}
                    style={{ background: 'var(--gradient-primary)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}
                  >
                    {uploading ? t('crew_sharing') : t('crew_share')}
                  </button>
                </div>
              )}
            </form>
          </div>

          {loadingSounds ? (
            <SoundGridSkeleton rows={4} />
          ) : sounds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('crew_no_sounds')}</div>
          ) : (
            <SoundGrid sounds={sounds} />
          )}
        </>
      )}
    </div>
  );
};
