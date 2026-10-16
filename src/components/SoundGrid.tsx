import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SoundItem } from '../types/sound';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { EditSoundModal } from './EditSoundModal';
import { PublishLocalModal } from './PublishLocalModal';
import { useTranslation } from '../hooks/useTranslation';
import { requestDownloadUrl, InsufficientCreditsError } from '../lib/soundUpload';
import { previewObjectName } from '../lib/audioPreview';
import { isAdminRole, isPublisherRole } from '../lib/roles';
import { licenseShortLabel, licenseLabel } from '../lib/licenses';
import { useCollections } from '../hooks/useCollections';
import { createCollection, addSoundToCollection, Collection } from '../lib/collections';
import type { TranslationKeys } from '../i18n/en';
import { Share2, Pencil, Trash2, Wand2, FolderPlus, Check } from 'lucide-react';
import { Icon } from './Icon';
import { WaveBars } from './WaveBars';
import { keyHue, camelotCode, shortKey } from '../lib/keyColor';
import type { SoundView } from '../store/useAppStore';
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import { invoke } from '@tauri-apps/api/core';
import { errorMessage } from '../lib/errors';
import './SoundGrid.css';

interface SoundRowProps {
  sound: SoundItem;
  /** Poziția în listă — pentru intrarea decalată a rândurilor. */
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  isSaved: boolean;
  canPublish: boolean;
  canModerate: boolean;
  isAnalyzing: boolean;
  isLoggedIn: boolean;
  t: (key: TranslationKeys) => string;
  collectionMenuOpen: boolean;
  collections: Collection[];
  onPlay: (sound: SoundItem) => void;
  onLike: (sound: SoundItem) => void;
  onDownload: (sound: SoundItem) => void;
  onShare: (sound: SoundItem) => void;
  onPublish: (sound: SoundItem) => void;
  onEdit: (sound: SoundItem) => void;
  onDelete: (sound: SoundItem) => void;
  onAnalyze: (sound: SoundItem) => void;
  onNavigateToProfile: (ownerId: string) => void;
  onToggleCollectionMenu: (soundId: string | number) => void;
  onAddToCollection: (sound: SoundItem, collectionId: string) => void;
  onCreateCollection: (sound: SoundItem, name: string) => void;
}

const SoundRow = React.memo(({
  sound, index, isCurrentTrack, isPlaying, isSaved, canPublish, canModerate, isAnalyzing, isLoggedIn, t,
  collectionMenuOpen, collections,
  onPlay, onLike, onDownload, onShare, onPublish, onEdit, onDelete, onAnalyze,
  onNavigateToProfile, onToggleCollectionMenu, onAddToCollection, onCreateCollection
}: SoundRowProps) => {
  // Drag nativ către alte aplicații (un DAW) e posibil doar pentru fișiere
  // deja pe disc — sunetele din cloud nu au o cale locală de oferit
  // sistemului de operare. `startDrag` are nevoie de calea brută, nu de
  // `file_url` (care pentru fișierele locale e deja convertit în asset://).
  const localPath = sound.local_path;
  const ownerId = sound.owner_id;
  const isDraggable = sound.id.toString().startsWith('local-') && !!localPath;
  const isLocal = sound.id.toString().startsWith('local-');
  // Contor pentru animația inimii — crește doar la salvare, nu la ștergere.
  const [likeTick, setLikeTick] = React.useState(0);

  return (
    <div
      className={`grid-row stagger-in${isDraggable ? ' draggable-row' : ''}${isCurrentTrack ? ' current' : ''}${isPlaying ? ' playing' : ''}`}
      style={{ '--i': index } as React.CSSProperties}
      onPointerMove={(e) => {
        // Lumina de sub cursor (::before în SoundGrid.css)
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable || !localPath) return;
        // Interceptăm drag-ul HTML5 și pornim unul nativ prin Tauri, ca
        // fișierul să poată fi plasat direct într-un DAW extern.
        e.preventDefault();
        startDrag({ item: [localPath], icon: 'icon.png' });
      }}
      title={isDraggable ? 'Drag into your DAW' : undefined}
    >
      <div className="col col-play">
        <button
          className="row-play-btn"
          onClick={() => onPlay(sound)}
          aria-label={sound.title}
        >
          {/* Triunghiul se strânge și apare egalizatorul cât cântă sunetul */}
          <svg className="play-tri" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
          <span className="row-eq" aria-hidden><span /><span /><span /></span>
        </button>
      </div>
      <div className="col col-title">
        <div className="sound-title">
          {sound.title}
          {sound.license && sound.license !== 'royalty_free' && (
            <span className="license-badge" title={licenseLabel(sound.license)}>{licenseShortLabel(sound.license)}</span>
          )}
        </div>
        {ownerId ? (
          <button className="sound-author sound-author-link" onClick={() => onNavigateToProfile(ownerId)}>
            {sound.author}
          </button>
        ) : (
          <div className="sound-author">{sound.author}</div>
        )}
      </div>
      <div className="col col-bpm num">{sound.bpm || '–'}</div>
      <div className="col col-key">
        {sound.key ? (
          <span className="key-chip" title={sound.key}>
            {camelotCode(sound.key) ? `${camelotCode(sound.key)} · ${shortKey(sound.key) ?? sound.key}` : sound.key}
          </span>
        ) : <span className="muted">–</span>}
      </div>
      <div className="col col-tags">
        {sound.tags.map((tag: string) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <div className="col col-actions">
        <button
          className={`row-action-btn bi-trigger${isSaved ? ' saved' : ''}`}
          onClick={() => {
            if (!isSaved) setLikeTick(n => n + 1);
            onLike(sound);
          }}
          title={t('save_to_my_sounds')}
          aria-pressed={isSaved}
        >
          <Icon name="heart" size={18} filled={isSaved} play={likeTick} />
        </button>
        <button className="row-action-btn bi-trigger" onClick={() => onDownload(sound)} title={t('download')}><Icon name="download" size={18} /></button>
        <button className="row-action-btn" onClick={() => onShare(sound)} title={t('grid_share')}><Share2 size={18} /></button>
        {isLoggedIn && !isLocal && (
          <CollectionMenu
            sound={sound}
            open={collectionMenuOpen}
            collections={collections}
            t={t}
            buttonClass="row-action-btn"
            onToggle={onToggleCollectionMenu}
            onAdd={onAddToCollection}
            onCreate={onCreateCollection}
          />
        )}
        {isLocal && !!sound.local_path && (
          <button
            className="row-action-btn"
            onClick={() => onAnalyze(sound)}
            disabled={isAnalyzing}
            title={t('grid_analyze')}
          >
            {isAnalyzing ? <Icon name="signal" size={18} play /> : <Wand2 size={18} />}
          </button>
        )}
        {isLocal && canPublish && (
          <button className="row-action-btn bi-trigger" onClick={() => onPublish(sound)} title={t('grid_publish')}><Icon name="upload" size={18} /></button>
        )}
        {!isLocal && canModerate && (
          <>
            <button className="row-action-btn" onClick={() => onEdit(sound)} title={t('grid_edit')}><Pencil size={18} /></button>
            <button className="row-action-btn danger" onClick={() => onDelete(sound)} title={t('grid_delete')}><Trash2 size={18} /></button>
          </>
        )}
      </div>
    </div>
  );
});

interface CollectionMenuProps {
  sound: SoundItem;
  open: boolean;
  collections: Collection[];
  t: (key: TranslationKeys) => string;
  buttonClass: string;
  onToggle: (soundId: string | number) => void;
  onAdd: (sound: SoundItem, collectionId: string) => void;
  onCreate: (sound: SoundItem, name: string) => void;
}

/** Butonul „Adaugă în colecție” + meniul lui — comun pentru rânduri și carduri. */
const CollectionMenu: React.FC<CollectionMenuProps> = ({ sound, open, collections, t, buttonClass, onToggle, onAdd, onCreate }) => {
  const [name, setName] = React.useState('');
  return (
    <div className="collection-menu-anchor">
      <button className={buttonClass} onClick={() => onToggle(sound.id)} title={t('grid_add_to_collection')}>
        <FolderPlus size={18} />
      </button>
      {open && (
        <div className="collection-menu">
          {collections.length === 0 && <div className="collection-menu-empty">{t('grid_no_collections')}</div>}
          {collections.map(c => (
            <button key={c.id} className="collection-menu-item" onClick={() => onAdd(sound, c.id)}>
              {c.name}
            </button>
          ))}
          <form
            className="collection-menu-new"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              onCreate(sound, name.trim());
              setName('');
            }}
          >
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('collections_new_placeholder')}
              onClick={e => e.stopPropagation()}
            />
            <button type="submit" title={t('grid_create')}><Check size={14} /></button>
          </form>
        </div>
      )}
    </div>
  );
};

/**
 * Sunetul ca un card: forma de undă reală (se umple cât cântă), play care
 * devine egalizator, culoarea tonalității și aceleași acțiuni ca rândul.
 */
const SoundCard = React.memo((props: SoundRowProps & { onHoverStart: (sound: SoundItem) => void; onHoverEnd: () => void }) => {
  const {
    sound, index, isCurrentTrack, isPlaying, isSaved, canPublish, canModerate, isAnalyzing, isLoggedIn, t,
    collectionMenuOpen, collections, onPlay, onLike, onDownload, onPublish, onEdit, onDelete, onAnalyze,
    onNavigateToProfile, onToggleCollectionMenu, onAddToCollection, onCreateCollection, onHoverStart, onHoverEnd,
  } = props;
  const [likeTick, setLikeTick] = React.useState(0);
  const isLocal = sound.id.toString().startsWith('local-');
  const localPath = sound.local_path;
  const isDraggable = isLocal && !!localPath;
  const hue = keyHue(sound.key);
  const code = camelotCode(sound.key);
  const short = shortKey(sound.key);
  // Uneltele rare (editare, ștergere, analiză, publicare) stau pe waveform și
  // apar la hover — în footer n-ar încăpea pe un card îngust.
  const hasTools = (isLocal && !!localPath) || (isLocal && canPublish) || (!isLocal && canModerate);

  return (
    <article
      className={`sound-card${isCurrentTrack ? ' current' : ''}${isPlaying ? ' playing' : ''}${hue == null ? ' no-key' : ''}`}
      style={{ '--h': hue ?? 255, '--i': Math.min(index, 14) } as React.CSSProperties}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      onPointerEnter={() => onHoverStart(sound)}
      onPointerLeave={onHoverEnd}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable || !localPath) return;
        e.preventDefault();
        startDrag({ item: [localPath], icon: 'icon.png' });
      }}
    >
      <div className="sc-wave" onClick={() => onPlay(sound)}>
        <WaveBars url={sound.preview_url || sound.file_url} active={isCurrentTrack} />
      </div>
      <button type="button" className="sc-play" onClick={() => onPlay(sound)} aria-label={sound.title}>
        <svg className="play-tri" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
        <span className="row-eq" aria-hidden><span /><span /><span /></span>
      </button>
      {hasTools && (
        <div className="sc-tools">
          {isLocal && !!localPath && (
            <button className="sc-tool" onClick={() => onAnalyze(sound)} disabled={isAnalyzing} title={t('grid_analyze')}>
              {isAnalyzing ? <Icon name="signal" size={15} play /> : <Wand2 size={15} />}
            </button>
          )}
          {isLocal && canPublish && (
            <button className="sc-tool" onClick={() => onPublish(sound)} title={t('grid_publish')}><Icon name="upload" size={15} /></button>
          )}
          {!isLocal && canModerate && (
            <>
              <button className="sc-tool" onClick={() => onEdit(sound)} title={t('grid_edit')}><Pencil size={14} /></button>
              <button className="sc-tool danger" onClick={() => onDelete(sound)} title={t('grid_delete')}><Trash2 size={14} /></button>
            </>
          )}
        </div>
      )}
      <div className="sc-meta">
        <b title={sound.title}>
          {sound.title}
          {sound.license && sound.license !== 'royalty_free' && (
            <span className="license-badge" title={licenseLabel(sound.license)}>{licenseShortLabel(sound.license)}</span>
          )}
        </b>
        {sound.owner_id ? (
          <button className="sound-author sound-author-link" onClick={() => onNavigateToProfile(sound.owner_id!)}>{sound.author}</button>
        ) : (
          <span className="sound-author">{sound.author}</span>
        )}
      </div>
      <div className="sc-foot">
        {sound.bpm ? <span className="sc-chip num">{sound.bpm}</span> : null}
        {sound.key ? <span className="sc-chip key" title={sound.key}>{code ? `${code} · ${short ?? sound.key}` : sound.key}</span> : null}
        <span className="sc-spacer" />
        <button
          className={`row-action-btn bi-trigger${isSaved ? ' saved' : ''}`}
          onClick={() => { if (!isSaved) setLikeTick(n => n + 1); onLike(sound); }}
          title={t('save_to_my_sounds')}
          aria-pressed={isSaved}
        >
          <Icon name="heart" size={18} filled={isSaved} play={likeTick} />
        </button>
        <button className="row-action-btn bi-trigger" onClick={() => onDownload(sound)} title={t('download')}>
          <Icon name="download" size={18} />
        </button>
        {isLoggedIn && !isLocal && (
          <CollectionMenu
            sound={sound}
            open={collectionMenuOpen}
            collections={collections}
            t={t}
            buttonClass="row-action-btn"
            onToggle={onToggleCollectionMenu}
            onAdd={onAddToCollection}
            onCreate={onCreateCollection}
          />
        )}
      </div>
    </article>
  );
});

interface SoundGridProps {
  sounds: SoundItem[];
  /**
   * Apelat după o analiză audio reușită (sau o editare), ca pagina părinte
   * să poată persista corecția în propriul store — necesar în special pentru
   * fișierele locale, care nu au nicio persistență server-side; fără asta,
   * corecția s-ar pierde la următoarea navigare, fiindcă `sounds` intern se
   * resincronizează din prop-ul `sounds` primit de la părinte.
   */
  onSoundUpdated?: (id: string | number, updates: Partial<SoundItem>) => void;
  /** Forțează un mod de afișare (ex. Fișiere locale = listă). Implicit: preferința din Setări. */
  view?: SoundView;
}

interface AudioAnalysis {
  bpm: number;
  key: string;
  bpm_confidence: number;
  key_confidence: number;
}

/**
 * Câte rânduri montăm odată. Listele pot avea mii de sunete (Local Files, un
 * profil, My Sounds); le randăm progresiv, pe măsură ce userul ajunge la
 * capăt, în loc de virtualizare clasică — aceea ar tăia meniul de colecții
 * (poziționat absolut) și ar cere propriul container de scroll.
 */
const RENDER_BATCH = 100;

export const SoundGrid: React.FC<SoundGridProps> = ({ sounds: initialSounds, onSoundUpdated, view: forcedView }) => {
  const preferredView = useAppStore(s => s.soundView);
  const hoverPreview = useAppStore(s => s.hoverPreview);
  const view = forcedView ?? preferredView;
  const hoverTimer = useRef<number>(0);
  const [sounds, setSounds] = useState<SoundItem[]>(initialSounds);
  const [renderCount, setRenderCount] = useState(RENDER_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [editingSound, setEditingSound] = useState<SoundItem | null>(null);
  const [publishingSound, setPublishingSound] = useState<SoundItem | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | number | null>(null);
  const [collectionMenuId, setCollectionMenuId] = useState<string | number | null>(null);
  const navigate = useNavigate();
  const { collections, refetch: refetchCollections } = useCollections();

  useEffect(() => {
    // `renderCount` nu se resetează aici: unele pagini trimit un array nou la
    // fiecare randare (filtrare inline), iar resetul ar strânge lista
    // înapoi la 100 de rânduri sub cursorul userului.
    setSounds(initialSounds);
  }, [initialSounds]);

  const hasMoreToRender = renderCount < sounds.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMoreToRender) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setRenderCount(count => count + RENDER_BATCH);
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreToRender, renderCount]);

  // Închide meniul de colecții la click în afara lui — un singur meniu poate
  // fi deschis odată, oricare rând, deci verificăm prin `closest` în loc de
  // un ref per-rând (SoundRow e memoizat separat, un ref n-ar avea cum să
  // urmărească rândul curent activ).
  useEffect(() => {
    if (collectionMenuId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.collection-menu-anchor')) {
        setCollectionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [collectionMenuId]);

  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const playQueue = usePlayerStore(state => state.playQueue);
  const togglePlay = usePlayerStore(state => state.togglePlay);
  const nextTrack = usePlayerStore(state => state.next);
  const prevTrack = usePlayerStore(state => state.prev);

  // Deleagă la coada reală a player-ului, în loc să caute local în `sounds`.
  // Varianta veche funcționa doar dacă piesa curentă era în lista AFIȘATĂ ÎN
  // ACEASTĂ grilă — dacă porneai redarea din Discover și navigai la My
  // Sounds fără să oprești, săgețile nu mai găseau piesa (index -1) și nu
  // făceau nimic. Coada reală urmărește ce redă efectiv player-ul, nu ce
  // pagină se întâmplă să fie deschisă.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!currentTrack) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        prevTrack();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextTrack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, nextTrack, prevTrack]);

  // Click pe play: dacă e deja piesa activă, doar pauză/reluare (nu strică
  // nicio coadă existentă). Altfel, coada devine lista curent afișată în
  // grilă, pornind de la sunetul apăsat — așa alimentăm next/prev cu context
  // real, nu doar redăm un singur sunet izolat.
  const handlePlay = useCallback((sound: SoundItem) => {
    if (currentTrack?.id === sound.id) {
      togglePlay();
      return;
    }
    const index = sounds.findIndex(s => s.id === sound.id);
    playQueue(sounds, index === -1 ? 0 : index);
  }, [sounds, currentTrack, togglePlay, playQueue]);

  // „Ascultă la hover” (Setări): după 450ms pe un card, pornește preview-ul.
  const handleHoverStart = useCallback((sound: SoundItem) => {
    if (!hoverPreview) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      if (usePlayerStore.getState().currentTrack?.id !== sound.id) handlePlay(sound);
    }, 450);
  }, [hoverPreview, handlePlay]);
  const handleHoverEnd = useCallback(() => window.clearTimeout(hoverTimer.current), []);

  const savedSounds = useLibraryStore(state => state.savedSounds);
  // Set în loc de `savedSounds.some(...)` pe fiecare rând (O(rânduri × salvate)).
  const savedIds = useMemo(() => new Set(savedSounds.map(s => s.id)), [savedSounds]);
  const toggleSaveSound = useLibraryStore(state => state.toggleSaveSound);
  const showToast = useAppStore(state => state.showToast);
  const session = useAuthStore(state => state.session);
  const { t } = useTranslation();
  
  const profile = useAuthStore(state => state.profile);
  const role = profile?.role;
  const canPublish = isPublisherRole(role);
  const isModerator = isAdminRole(role);

  // Editarea/ștergerea aparțin fie moderatorilor, fie proprietarului
  // sunetului. Regula reală e în RLS; asta doar ascunde butoanele.
  const canManage = useCallback(
    (sound: SoundItem) =>
      isModerator || (!!profile?.id && sound.owner_id === profile.id),
    [isModerator, profile?.id]
  );

  const handleDelete = useCallback(async (sound: SoundItem) => {
    if (!window.confirm(t('grid_delete_confirm'))) return;
    try {
      showToast(t('grid_deleting'), 'info');

      // Fișierele se șterg ÎNAINTEA rândului. Anterior se ștergea doar rândul,
      // iar fișierul rămânea în storage la nesfârșit — invizibil în aplicație,
      // dar consumând spațiu. Așa au apărut obiectele orfane din bucket.
      const storagePath =
        sound.storage_path ??
        (sound.file_url?.includes('/object/public/sounds/')
          ? sound.file_url.split('/object/public/sounds/')[1]
          : undefined);

      if (storagePath) {
        const { error: fileError } = await supabase.storage
          .from('sounds')
          .remove([storagePath]);
        if (fileError) console.error('Storage delete error:', fileError);

        const { error: previewError } = await supabase.storage
          .from('sound-previews')
          .remove([previewObjectName(storagePath)]);
        if (previewError) console.error('Preview delete error:', previewError);
      }

      const { error } = await supabase.from('sounds').delete().eq('id', sound.id);
      if (error) throw error;

      setSounds(prev => prev.filter(s => s.id !== sound.id));
      showToast(t('grid_deleted'), 'success');
    } catch (err) {
      console.error(err);
      showToast(`${t('grid_delete_failed')} ${errorMessage(err)}`, 'error');
    }
  }, [showToast, t]);

  const handleEditSuccess = useCallback((soundId: string | number, updated: Partial<SoundItem>) => {
    setSounds(prev => prev.map(s => s.id === soundId ? { ...s, ...updated } as SoundItem : s));
    onSoundUpdated?.(soundId, updated);
  }, [onSoundUpdated]);

  const handleAnalyze = useCallback(async (sound: SoundItem) => {
    if (!sound.local_path) return;
    setAnalyzingId(sound.id);
    try {
      const result = await invoke<AudioAnalysis>('analyze_sample_audio', { path: sound.local_path });
      const bpm = Math.round(result.bpm);
      const updates: Partial<SoundItem> = { bpm, key: result.key };

      setSounds(prev => prev.map(s => s.id === sound.id ? { ...s, ...updates } : s));
      onSoundUpdated?.(sound.id, updates);

      // Biblioteca de analiză își raportează singură cât de sigură e —
      // sub 0.3 chiar ea consideră rezultatul nesigur (fișiere fără
      // tonalitate clară: percuție pură, zgomot, FX). Un rezultat afișat
      // fără această avertizare ar părea la fel de sigur ca unul cert.
      if (result.key_confidence < 0.3) {
        showToast(t('grid_analyze_low_key', { bpm, key: result.key }), 'info');
      } else {
        showToast(t('grid_analyze_done', { bpm, key: result.key }), 'success');
      }
    } catch (err) {
      console.error('analyze_sample_audio failed:', err);
      showToast(`${t('grid_analyze_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setAnalyzingId(null);
    }
  }, [showToast, onSoundUpdated, t]);

  const handleLike = useCallback((sound: SoundItem) => {
    toggleSaveSound(sound);
  }, [toggleSaveSound]);

  const handleDownload = useCallback(async (sound: SoundItem) => {
    const isLocal = sound.id.toString().startsWith('local-');

    if (!isLocal && !session) {
      showToast(t('logged_in_download'), 'error');
      return;
    }

    try {
      const filePath = await save({
        defaultPath: `${sound.title.replace(/\s+/g, '_')}.wav`,
        filters: [{ name: 'Audio', extensions: ['wav'] }]
      });

      if (!filePath) {
        showToast(t('download_cancelled'), 'info');
        return;
      }

      showToast(t('preparing_download'), 'info');

      // Pentru sunetele din cloud, URL-ul vine de la server, care consumă
      // creditul în aceeași cerere. Fișierul complet stă în bucket privat,
      // deci nu există cale de a-l lua ocolind plata. Creditul se ia abia
      // aici, după ce userul a ales destinația.
      const sourceUrl = isLocal
        ? (sound.file_url ?? '')
        : await requestDownloadUrl(sound.id.toString());

      const response = await tauriFetch(sourceUrl);
      const buffer = await response.arrayBuffer();

      await writeFile(filePath, new Uint8Array(buffer));

      showToast(t('download_complete'), 'success');
    } catch (error) {
      console.error('[download]', error);
      if (error instanceof InsufficientCreditsError) {
        showToast(t('not_enough_credits'), 'error');
      } else {
        // Mesajul brut, nu doar eticheta generică: fără el orice esec arata
        // la fel, iar cauza reala ramane doar in consola.
        const detail = error instanceof Error ? error.message : String(error);
        showToast(`${t('download_failed')}: ${detail}`, 'error');
      }
    }
  }, [session, showToast, t]);

  const handleShare = useCallback((sound: SoundItem) => {
    navigator.clipboard.writeText(`${sound.title} by ${sound.author}`);
    showToast(t('grid_copied'), 'success');
  }, [showToast, t]);

  const handlePublishClick = useCallback((sound: SoundItem) => {
    setPublishingSound(sound);
  }, []);

  const handleNavigateToProfile = useCallback((ownerId: string) => {
    navigate(`/producer/${ownerId}`);
  }, [navigate]);

  const handleToggleCollectionMenu = useCallback((soundId: string | number) => {
    setCollectionMenuId(prev => prev === soundId ? null : soundId);
  }, []);

  const handleAddToCollection = useCallback(async (sound: SoundItem, collectionId: string) => {
    try {
      await addSoundToCollection(collectionId, sound.id);
      showToast(t('grid_added_to_collection'), 'success');
    } catch (err) {
      showToast(`${t('grid_add_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setCollectionMenuId(null);
    }
  }, [showToast, t]);

  const handleCreateCollection = useCallback(async (sound: SoundItem, name: string) => {
    try {
      const collection = await createCollection(name);
      await addSoundToCollection(collection.id, sound.id);
      await refetchCollections();
      showToast(t('grid_collection_created', { name: collection.name }), 'success');
    } catch (err) {
      showToast(`${t('grid_create_failed')} ${errorMessage(err)}`, 'error');
    } finally {
      setCollectionMenuId(null);
    }
  }, [showToast, refetchCollections, t]);

  return (
    <div className={view === 'cards' ? 'sound-cards' : 'sound-grid'}>
      {view === 'cards' ? (
        <div className="card-grid">
          {sounds.slice(0, renderCount).map((sound, index) => {
            const isCurrentTrack = currentTrack?.id === sound.id;
            return (
              <SoundCard
                key={sound.id}
                sound={sound}
                index={index}
                isCurrentTrack={isCurrentTrack}
                isPlaying={isCurrentTrack && isPlaying}
                isSaved={savedIds.has(sound.id)}
                canPublish={canPublish}
                canModerate={canManage(sound)}
                isAnalyzing={analyzingId === sound.id}
                isLoggedIn={!!session}
                collectionMenuOpen={collectionMenuId === sound.id}
                collections={collections}
                t={t}
                onPlay={handlePlay}
                onLike={handleLike}
                onDownload={handleDownload}
                onShare={handleShare}
                onPublish={handlePublishClick}
                onEdit={setEditingSound}
                onDelete={handleDelete}
                onNavigateToProfile={handleNavigateToProfile}
                onToggleCollectionMenu={handleToggleCollectionMenu}
                onAddToCollection={handleAddToCollection}
                onCreateCollection={handleCreateCollection}
                onAnalyze={handleAnalyze}
                onHoverStart={handleHoverStart}
                onHoverEnd={handleHoverEnd}
              />
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid-header">
            <div className="col col-play"></div>
            <div className="col col-title">{t('title_label')}</div>
            <div className="col col-bpm">BPM</div>
            <div className="col col-key">{t('grid_key')}</div>
            <div className="col col-tags">{t('grid_tags')}</div>
            <div className="col col-actions"></div>
          </div>
          
          <div className="grid-body">
            {sounds.slice(0, renderCount).map((sound, index) => {
              const isCurrentTrack = currentTrack?.id === sound.id;
              return (
                <SoundRow
                  key={sound.id}
                  sound={sound}
                  index={index}
                  isCurrentTrack={isCurrentTrack}
                  // Doar rândul activ primește starea reală — altfel fiecare
                  // play/pauză re-randa toate rândurile (memo-ul nu mai ajuta).
                  isPlaying={isCurrentTrack && isPlaying}
                  isSaved={savedIds.has(sound.id)}
                  canPublish={canPublish}
                  canModerate={canManage(sound)}
                  isAnalyzing={analyzingId === sound.id}
                  isLoggedIn={!!session}
                  collectionMenuOpen={collectionMenuId === sound.id}
                  collections={collections}
                  t={t}
                  onPlay={handlePlay}
                  onLike={handleLike}
                  onDownload={handleDownload}
                  onShare={handleShare}
                  onPublish={handlePublishClick}
                  onEdit={setEditingSound}
                  onDelete={handleDelete}
                  onNavigateToProfile={handleNavigateToProfile}
                  onToggleCollectionMenu={handleToggleCollectionMenu}
                  onAddToCollection={handleAddToCollection}
                  onCreateCollection={handleCreateCollection}
                  onAnalyze={handleAnalyze}
                />
              );
            })}
          </div>
        </>
      )}
      {hasMoreToRender && <div ref={sentinelRef} className="grid-sentinel" aria-hidden />}

      {editingSound && (
        <EditSoundModal 
          sound={editingSound} 
          onClose={() => setEditingSound(null)}
          onSuccess={(updated) => handleEditSuccess(editingSound.id, updated)}
        />
      )}

      {publishingSound && (
        <PublishLocalModal 
          sound={publishingSound} 
          onClose={() => setPublishingSound(null)}
          onSuccess={() => {
            // Optional: you can mark it as published or refresh if needed.
          }}
        />
      )}
    </div>
  );
};
