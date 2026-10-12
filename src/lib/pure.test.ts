import { describe, expect, it, vi } from 'vitest';

// soundUpload importă clientul Supabase, care aruncă fără variabilele de mediu.
vi.mock('./supabase', () => ({ supabase: {} }));

import { hasUnlimitedCredits, isAdminRole, isPublisherRole } from './roles';
import { licenseLabel, licenseShortLabel } from './licenses';
import { mapSoundRow } from './soundRow';
import { previewObjectName } from './audioPreview';
import { slugifyForStorage } from './soundUpload';
import { downloadPercent } from './updater';
import type { Tables } from './database.types';

describe('roles', () => {
  it('only admins can moderate', () => {
    expect(isAdminRole('OWNER')).toBe(true);
    expect(isAdminRole('PRODUCER ADMIN')).toBe(true);
    expect(isAdminRole('PRODUCER')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });

  it('publishers include producers and admins, not plain users', () => {
    expect(isPublisherRole('PRODUCER')).toBe(true);
    expect(isPublisherRole('VIDEO MAKER')).toBe(true);
    expect(isPublisherRole('OWNER')).toBe(true);
    expect(isPublisherRole('USER')).toBe(false);
    expect(isPublisherRole('owner')).toBe(false);
  });

  it('unlimited credits for OWNER or the ultimate tier', () => {
    expect(hasUnlimitedCredits('OWNER', 'free')).toBe(true);
    expect(hasUnlimitedCredits('USER', 'ultimate')).toBe(true);
    expect(hasUnlimitedCredits('PRODUCER ADMIN', 'producer')).toBe(false);
    expect(hasUnlimitedCredits(null, null)).toBe(false);
  });
});

describe('licenses', () => {
  it('labels known licenses', () => {
    expect(licenseLabel('exclusive')).toBe('Exclusive');
    expect(licenseShortLabel('attribution_required')).toBe('AT');
  });

  it('defaults a missing license to royalty-free', () => {
    expect(licenseLabel(null)).toBe('Royalty-Free');
    expect(licenseLabel(undefined)).toBe('Royalty-Free');
    expect(licenseShortLabel(null)).toBe('RF');
  });

  it('shows an unknown license verbatim rather than crashing', () => {
    expect(licenseLabel('custom_deal')).toBe('custom_deal');
    expect(licenseShortLabel('custom_deal')).toBe('RF');
  });
});

describe('mapSoundRow', () => {
  const row: Tables<'sounds'> = {
    id: 'abc',
    title: 'Dark Keys',
    author: 'someone',
    bpm: 140,
    key_signature: 'Am',
    tags: null,
    duration: null,
    type: 'loop',
    file_url: null,
    preview_url: 'https://example.com/p.mp3',
    storage_path: 'u/1_dark_keys.wav',
    owner_id: null,
    license: 'royalty_free',
    status: 'approved',
    created_at: '2026-01-01T00:00:00Z',
    crew_id: null,
  };

  it('maps key_signature to key (the My Sounds / Admin empty-Key bug)', () => {
    expect(mapSoundRow(row).key).toBe('Am');
  });

  it('fills safe defaults for nullable columns', () => {
    const sound = mapSoundRow(row);
    expect(sound.tags).toEqual([]);
    expect(sound.duration).toBe('0:00');
    expect(sound.file_url).toBeUndefined();
    expect(sound.owner_id).toBeUndefined();
  });
});

describe('storage names', () => {
  it('swaps the extension for .mp3 previews', () => {
    expect(previewObjectName('u/123_kick.wav')).toBe('u/123_kick.mp3');
    expect(previewObjectName('u/123_my.loop.flac')).toBe('u/123_my.loop.mp3');
  });

  it('does not treat a dot in a folder name as an extension', () => {
    expect(previewObjectName('u.v/kick')).toBe('u.v/kick.mp3');
  });

  it('slugifies titles into predictable keys', () => {
    expect(slugifyForStorage('Some Title!')).toBe('some_title');
    expect(slugifyForStorage('  808 -- Bass  ')).toBe('808_bass');
    expect(slugifyForStorage('!!!')).toBe('untitled');
    expect(slugifyForStorage('Șoaptă')).toBe('oapt');
  });
});

describe('downloadPercent', () => {
  it('is null without a Content-Length', () => {
    expect(downloadPercent(500, 0)).toBeNull();
  });

  it('rounds and caps at 100', () => {
    expect(downloadPercent(0, 1000)).toBe(0);
    expect(downloadPercent(333, 1000)).toBe(33);
    expect(downloadPercent(1200, 1000)).toBe(100);
  });
});
