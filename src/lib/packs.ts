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

// Tonuri închise din paleta Studio (violet, semnal, verde, ambră, roz, grafit) —
// subtile, ca titlul să rămână citibil fără umbră de text.
const PACK_GRADIENTS = [
  'linear-gradient(140deg, #2b2360 0%, #16141f 70%)',
  'linear-gradient(140deg, #113a46 0%, #12151c 70%)',
  'linear-gradient(140deg, #1c3b30 0%, #121614 70%)',
  'linear-gradient(140deg, #46321a 0%, #17130f 70%)',
  'linear-gradient(140deg, #3e1f30 0%, #161216 70%)',
  'linear-gradient(140deg, #2a2a38 0%, #131319 70%)',
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
