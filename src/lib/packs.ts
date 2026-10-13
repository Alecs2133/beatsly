/**
 * „Pack”-urile din Discover și din pagina Packs nu sunt entități în baza de
 * date — sunt tag-urile cele mai folosite, fiecare devenind un pack cu toate
 * sunetele care îl au.
 */
export interface TagPack {
  id: string;
  tag: string;
  title: string;
  author: string;
  count: number;
  color: string;
}

const PACK_GRADIENTS = [
  'linear-gradient(135deg, #ff007f, #7928ca)',
  'linear-gradient(135deg, #00c6ff, #0072ff)',
  'linear-gradient(135deg, #fceabb, #f8b500)',
  'linear-gradient(135deg, #11998e, #38ef7d)',
  'linear-gradient(135deg, #ff416c, #ff4b2b)',
  'linear-gradient(135deg, #9d4edd, #ff007f)',
];

/**
 * Pack-uri din listele de tag-uri ale sunetelor, ordonate descrescător după
 * numărul de sunete (la egalitate: ordinea primei apariții).
 */
export function buildTagPacks(tagLists: readonly (readonly string[] | null | undefined)[], limit?: number): TagPack[] {
  const counts = new Map<string, number>();
  for (const tags of tagLists) {
    for (const tag of tags ?? []) {
      if (tag && tag.trim().length > 0) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked.slice(0, limit).map(([tag, count], index) => ({
    id: tag,
    tag,
    title: `${tag.charAt(0).toUpperCase() + tag.slice(1)} Pack`,
    author: 'Community',
    count,
    color: PACK_GRADIENTS[index % PACK_GRADIENTS.length],
  }));
}
