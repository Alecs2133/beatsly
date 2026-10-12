import { describe, expect, it } from 'vitest';
import { fetchAllPages, fetchByIdChunks, IN_CHUNK_SIZE, PAGE_SIZE } from './paging';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Simulează PostgREST: `.range(from, to)` peste un tabel cu `total` rânduri. */
function fakeTable(total: number) {
  const calls: [number, number][] = [];
  const rows = range(total);
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  };
  return { page, calls };
}

describe('fetchAllPages', () => {
  it('reads past the 1000-row cap', async () => {
    const { page, calls } = fakeTable(2500);
    const rows = await fetchAllPages(page);
    expect(rows).toEqual(range(2500));
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('makes one extra request when the total is an exact multiple', async () => {
    const { page, calls } = fakeTable(PAGE_SIZE);
    expect(await fetchAllPages(page)).toHaveLength(PAGE_SIZE);
    expect(calls).toHaveLength(2);
  });

  it('handles an empty table and null data', async () => {
    expect(await fetchAllPages(fakeTable(0).page)).toEqual([]);
    expect(await fetchAllPages(async () => ({ data: null, error: null }))).toEqual([]);
  });

  it('throws the query error', async () => {
    const error = new Error('permission denied');
    await expect(fetchAllPages(async () => ({ data: null, error }))).rejects.toBe(error);
  });
});

describe('fetchByIdChunks', () => {
  it('splits long id lists so the URL stays short', async () => {
    const ids = range(250).map(String);
    const seen: number[] = [];
    const rows = await fetchByIdChunks(ids, async chunk => {
      seen.push(chunk.length);
      return { data: chunk, error: null };
    });
    expect(seen).toEqual([IN_CHUNK_SIZE, IN_CHUNK_SIZE, 50]);
    expect(rows).toEqual(ids);
  });

  it('makes no request for an empty list', async () => {
    let calls = 0;
    await fetchByIdChunks([], async () => {
      calls++;
      return { data: [], error: null };
    });
    expect(calls).toBe(0);
  });
});
