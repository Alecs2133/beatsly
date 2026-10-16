import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Disc3, Gauge, LogOut, Play, Search, SlidersHorizontal, User, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../hooks/useTranslation';
import { ALL_KEYS, parseKey, toCamelot } from '../lib/musicKey';
import { isAdminRole, isPublisherRole } from '../lib/roles';
import './CommandPalette.css';

interface Command {
  id: string;
  section: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

/** „8A”, „8a”, „Am”, „F# minor” → indexul din ALL_KEYS, sau null. */
function findKeyIndex(query: string): number | null {
  const q = query.trim();
  const camelot = q.toUpperCase().match(/^(1[0-2]|[1-9])([AB])$/);
  if (camelot) {
    const idx = ALL_KEYS.findIndex(k => toCamelot(k.key) === camelot[0]);
    return idx >= 0 ? idx : null;
  }
  const parsed = parseKey(q);
  if (!parsed || q.length > 9) return null;
  const idx = ALL_KEYS.findIndex(k => k.key.root === parsed.root && k.key.mode === parsed.mode);
  return idx >= 0 ? idx : null;
}

/**
 * Paleta de comenzi (Ctrl/⌘ + K): navigare, căutare, filtre („140”, „8A”),
 * redare din Sunetele mele și acțiuni rapide — totul din tastatură.
 */
export const CommandPalette: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    commandOpen, setCommandOpen, setSettingsOpen, setSearchQuery,
    setDiscoverBpm, setDiscoverKey, clearDiscoverFilters,
  } = useAppStore();
  const { user, profile, signOut } = useAuthStore();
  const savedSounds = useLibraryStore(s => s.savedSounds);
  const playQueue = usePlayerStore(s => s.playQueue);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Ctrl/⌘ + K de oriunde; Esc închide.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(!useAppStore.getState().commandOpen);
      } else if (e.key === 'Escape' && useAppStore.getState().commandOpen) {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCommandOpen]);

  useEffect(() => {
    if (!commandOpen) return;
    setQuery('');
    setActive(0);
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [commandOpen]);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => { setSettingsOpen(false); navigate(path); };
    const list: Command[] = [];
    const q = query.trim();
    const ql = q.toLowerCase();

    // Comenzi „inteligente” din ce scrii
    const bpm = Number(q);
    if (Number.isInteger(bpm) && bpm >= 50 && bpm <= 220) {
      list.push({ id: 'bpm', section: t('cmd_filters'), label: t('cmd_filter_bpm', { bpm }), icon: <Gauge size={15} />, run: () => { setDiscoverBpm(bpm); go('/')(); } });
    }
    const keyIdx = q ? findKeyIndex(q) : null;
    if (keyIdx != null) {
      const k = ALL_KEYS[keyIdx];
      list.push({ id: 'key', section: t('cmd_filters'), label: t('cmd_filter_key', { key: `${toCamelot(k.key)} · ${k.label}` }), icon: <Disc3 size={15} />, run: () => { setDiscoverKey(keyIdx); go('/')(); } });
    }
    if (q && keyIdx == null && !(bpm >= 50 && bpm <= 220)) {
      list.push({ id: 'search', section: t('cmd_search'), label: t('cmd_search_for', { q }), icon: <Search size={15} />, run: () => { setSearchQuery(q); go('/')(); } });
    }

    // Navigare
    const nav: Command[] = [
      { id: 'go-discover', section: t('cmd_navigate'), label: t('nav_discover'), icon: <Compass size={15} />, run: go('/') },
      { id: 'go-library', section: t('cmd_navigate'), label: t('nav_my_sounds'), icon: <ArrowRight size={15} />, run: go('/library') },
      { id: 'go-store', section: t('cmd_navigate'), label: t('nav_store'), icon: <ArrowRight size={15} />, run: go('/store') },
      { id: 'go-profile', section: t('cmd_navigate'), label: t('topbar_profile'), icon: <User size={15} />, run: go('/account') },
      { id: 'go-settings', section: t('cmd_navigate'), label: t('topbar_settings'), icon: <SlidersHorizontal size={15} />, run: () => setSettingsOpen(true) },
    ];
    if (isPublisherRole(profile?.role)) nav.push({ id: 'go-upload', section: t('cmd_navigate'), label: t('nav_upload'), icon: <ArrowRight size={15} />, run: go('/upload') });
    if (isAdminRole(profile?.role)) nav.push({ id: 'go-admin', section: t('cmd_navigate'), label: t('nav_admin'), icon: <ArrowRight size={15} />, run: go('/admin') });
    list.push(...nav.filter(c => !ql || c.label.toLowerCase().includes(ql)));

    // Redă din Sunetele mele
    const matches = savedSounds.filter(s => !ql || s.title.toLowerCase().includes(ql) || s.author.toLowerCase().includes(ql)).slice(0, 6);
    matches.forEach(s => list.push({
      id: `play-${s.id}`,
      section: t('nav_my_sounds'),
      label: t('cmd_play', { title: s.title }),
      hint: [s.bpm ? `${s.bpm} BPM` : null, s.key].filter(Boolean).join(' · '),
      icon: <Play size={14} fill="currentColor" />,
      run: () => playQueue(savedSounds, savedSounds.indexOf(s)),
    }));

    // Acțiuni
    const actions: Command[] = [
      { id: 'clear', section: t('cmd_actions'), label: t('cmd_clear_filters'), icon: <X size={15} />, run: () => { clearDiscoverFilters(); go('/')(); } },
    ];
    if (user) actions.push({ id: 'logout', section: t('cmd_actions'), label: t('topbar_logout'), icon: <LogOut size={15} />, run: async () => { await signOut(); navigate('/auth'); } });
    list.push(...actions.filter(c => !ql || c.label.toLowerCase().includes(ql)));

    return list;
  }, [query, t, navigate, savedSounds, profile, user, setSettingsOpen, setSearchQuery, setDiscoverBpm, setDiscoverKey, clearDiscoverFilters, playQueue, signOut]);

  useEffect(() => {
    setActive(a => Math.min(a, Math.max(0, commands.length - 1)));
  }, [commands.length]);

  useEffect(() => {
    listRef.current?.querySelector('.cmd-item.active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!commandOpen) return null;

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    setCommandOpen(false);
    cmd.run();
  };

  let lastSection = '';

  return (
    <div className="cmd-scrim" onMouseDown={(e) => e.target === e.currentTarget && setCommandOpen(false)}>
      <div className="cmd" role="dialog" aria-modal="true" aria-label={t('cmd_title')}>
        <div className="cmd-input">
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            placeholder={t('cmd_placeholder')}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(commands.length - 1, a + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
              if (e.key === 'Enter') { e.preventDefault(); run(commands[active]); }
            }}
            aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cmd-list" ref={listRef} role="listbox">
          {commands.length === 0 && <div className="cmd-empty">{t('cmd_nothing')}</div>}
          {commands.map((cmd, i) => {
            const header = cmd.section !== lastSection ? cmd.section : null;
            lastSection = cmd.section;
            return (
              <React.Fragment key={cmd.id}>
                {header && <div className="cmd-section">{header}</div>}
                <button
                  type="button"
                  id={`cmd-${cmd.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={`cmd-item${i === active ? ' active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(cmd)}
                >
                  <span className="cmd-icon">{cmd.icon}</span>
                  <span className="cmd-label">{cmd.label}</span>
                  {cmd.hint && <span className="cmd-hint num">{cmd.hint}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
