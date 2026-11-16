import { describe, expect, it } from 'vitest';
import { ALL_KEYS, isHarmonicallyCompatible, keyCandidates, keyMatchesFilter, parseKey, toCamelot } from './musicKey';

const key = (raw: string) => {
  const parsed = parseKey(raw);
  if (!parsed) throw new Error(`test key "${raw}" did not parse`);
  return parsed;
};

describe('parseKey', () => {
  it.each([
    ['C', { root: 0, mode: 'major' }],
    ['Am', { root: 9, mode: 'minor' }],
    ['A min', { root: 9, mode: 'minor' }],
    ['A Minor', { root: 9, mode: 'minor' }],
    ['F#maj', { root: 6, mode: 'major' }],
    ['F# major', { root: 6, mode: 'major' }],
    ['C#m', { root: 1, mode: 'minor' }],
    ['Db', { root: 1, mode: 'major' }],
    ['Bbm', { root: 10, mode: 'minor' }],
    ['Bm', { root: 11, mode: 'minor' }],
    ['  ebm  ', { root: 3, mode: 'minor' }],
  ])('%s', (raw, expected) => {
    expect(parseKey(raw)).toEqual(expected);
  });

  it.each([null, undefined, '', 'H', 'Cb', 'E#', 'Fmaj7', 'not a key'])(
    'rejects %j',
    (raw) => {
      expect(parseKey(raw)).toBeNull();
    }
  );
});

describe('toCamelot', () => {
  it.each([
    ['C', '8B'],
    ['Am', '8A'],
    ['G', '9B'],
    ['Em', '9A'],
    ['F', '7B'],
    ['Dm', '7A'],
    ['B', '1B'],
    ['G#m', '1A'],
    ['E', '12B'],
    ['C#m', '12A'],
  ])('%s → %s', (raw, code) => {
    expect(toCamelot(key(raw))).toBe(code);
  });

  it('gives every one of the 24 keys a distinct code', () => {
    const codes = new Set(ALL_KEYS.map(k => toCamelot(k.key)));
    expect(codes.size).toBe(24);
  });
});

describe('isHarmonicallyCompatible', () => {
  it('matches the same key', () => {
    expect(isHarmonicallyCompatible(key('Am'), key('A minor'))).toBe(true);
  });

  it('matches the relative major/minor', () => {
    expect(isHarmonicallyCompatible(key('C'), key('Am'))).toBe(true);
  });

  it('matches neighbours on the wheel', () => {
    expect(isHarmonicallyCompatible(key('C'), key('G'))).toBe(true);
    expect(isHarmonicallyCompatible(key('C'), key('F'))).toBe(true);
  });

  it('wraps around 12 ↔ 1', () => {
    // E major = 12B, B major = 1B.
    expect(isHarmonicallyCompatible(key('E'), key('B'))).toBe(true);
  });

  it('rejects distant keys', () => {
    expect(isHarmonicallyCompatible(key('C'), key('F#'))).toBe(false);
    expect(isHarmonicallyCompatible(key('C'), key('Em'))).toBe(false);
  });
});

describe('keyMatchesFilter', () => {
  it('treats a bare note as both major and minor', () => {
    expect(keyCandidates('C')).toEqual([{ root: 0, mode: 'major' }, { root: 0, mode: 'minor' }]);
    expect(keyMatchesFilter(key('Cmaj'), 'C')).toBe(true);
    expect(keyMatchesFilter(key('Cm'), 'C')).toBe(true);
    expect(keyMatchesFilter(key('F#m'), 'F#')).toBe(true);
    expect(keyMatchesFilter(key('Ebm'), 'Eb')).toBe(true);
  });

  it('keeps an explicit mode strict', () => {
    expect(keyCandidates('Cmaj')).toEqual([{ root: 0, mode: 'major' }]);
    expect(keyCandidates('C major')).toEqual([{ root: 0, mode: 'major' }]);
    expect(keyCandidates('Cm')).toEqual([{ root: 0, mode: 'minor' }]);
    // Cm = 5A, C major = 8B — departe pe roată.
    expect(keyMatchesFilter(key('Cm'), 'C major')).toBe(false);
  });

  it('still rejects unrelated and unparsable keys', () => {
    expect(keyMatchesFilter(key('Cm'), 'F#')).toBe(false);
    expect(keyMatchesFilter(key('Cm'), 'nope')).toBe(false);
    expect(keyMatchesFilter(key('Cm'), null)).toBe(false);
  });
});
