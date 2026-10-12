// Regenerează tipurile TypeScript din schema Supabase (proiectul link-uit)
// și le scrie atât în app, cât și în website. Rulează după fiecare migrare:
//   npm run gen:types
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const types = execSync('npx --yes supabase gen types typescript --linked --schema public', {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});

for (const target of ['src/lib/database.types.ts', 'website/src/lib/database.types.ts']) {
  writeFileSync(target, types);
  console.log(`wrote ${target}`);
}
