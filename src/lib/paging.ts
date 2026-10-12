/**
 * PostgREST (Supabase) întoarce cel mult 1000 de rânduri pe cerere, fără
 * nicio eroare — restul lipsesc pur și simplu. Helper-ele de aici citesc în
 * pagini până la capăt, ca listele să nu se oprească tăcut la 1000.
 */

/** Limita `max_rows` din Supabase (implicit 1000). */
export const PAGE_SIZE = 1000;

/**
 * Câte id-uri punem într-un singur `.in('id', ...)`. Filtrul ajunge în URL,
 * iar câteva sute de uuid-uri trec de limita de lungime a URL-ului.
 */
export const IN_CHUNK_SIZE = 100;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * Citește toate rândurile, pagină cu pagină. `page(from, to)` trebuie să
 * construiască query-ul cu `.range(from, to)` și o ordonare stabilă (cu `id`
 * la final), altfel rândurile cu aceeași valoare de sortare se pot dubla sau
 * pierde între pagini.
 */
export async function fetchAllPages<T>(page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

/** Rulează `fetch` pe bucăți de id-uri (în paralel) și concatenează rezultatele. */
export async function fetchByIdChunks<T>(
  ids: readonly string[],
  fetch: (chunk: string[]) => PageResult<T>
): Promise<T[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + IN_CHUNK_SIZE));
  }
  const results = await Promise.all(
    chunks.map(async chunk => {
      const { data, error } = await fetch(chunk);
      if (error) throw error;
      return data ?? [];
    })
  );
  return results.flat();
}
