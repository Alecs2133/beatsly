// Pregătește un release nou într-o singură comandă:
//   npm run release -- 0.2.0          (sau: patch | minor | major)
//
// 1. verifică: branch main, working tree curat, versiune semver validă
// 2. rulează lint + typecheck + teste (aceleași ca în CI)
// 3. setează versiunea în package.json, package-lock.json, Cargo.toml, Cargo.lock
// 4. face commit-ul `chore(release): vX.Y.Z` și tag-ul `vX.Y.Z`
//
// NU face push. Comanda de push e afișată la final — după push, release.yml
// construiește installerele și publică release-ul singur, după ce toate
// platformele au reușit.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const current = pkg.version;
const arg = process.argv[2];

function nextVersion(spec) {
  const m = current.match(SEMVER);
  if (!m) fail(`Versiunea curentă "${current}" nu e semver X.Y.Z.`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (spec === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (spec === 'minor') return `${major}.${minor + 1}.0`;
  if (spec === 'major') return `${major + 1}.0.0`;
  return spec;
}

if (!arg) fail(`Folosire: npm run release -- <X.Y.Z | patch | minor | major>   (acum: ${current})`);
const version = nextVersion(arg);

// Tauri/MSI acceptă doar X.Y.Z numeric (fără "0.1.7.2" sau "-beta").
if (!SEMVER.test(version)) fail(`"${version}" nu e o versiune validă. Folosește X.Y.Z, ex. 0.2.0.`);

const cmp = (a, b) => {
  const [x, y] = [a, b].map(v => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};
// Updater-ul instalează doar versiuni MAI MARI decât cea curentă.
if (cmp(version, current) <= 0) fail(`${version} trebuie să fie mai mare decât versiunea curentă ${current}.`);

const branch = out('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') fail(`Ești pe "${branch}". Release-urile se fac din main.`);

if (out('git status --porcelain')) fail('Ai modificări necomise. Fă commit (sau stash) înainte de release.');

if (out(`git tag --list v${version}`)) fail(`Tag-ul v${version} există deja.`);

console.log(`\n▶ Release ${current} → ${version}\n`);

console.log('▶ Verificări (lint, typecheck, teste)…');
run('npm run lint');
run('npx tsc --noEmit');
run('npm test');

console.log('\n▶ Actualizez versiunea…');

// package.json + package-lock.json, păstrând formatarea existentă.
run(`npm version ${version} --no-git-tag-version`);

const cargoTomlPath = 'src-tauri/Cargo.toml';
const cargoToml = readFileSync(cargoTomlPath, 'utf8');
// Prima linie `version = "..."` e cea din [package].
const newCargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`);
if (newCargoToml === cargoToml) fail('Nu am găsit `version = "..."` în Cargo.toml.');
writeFileSync(cargoTomlPath, newCargoToml);

// Actualizează doar intrarea aplicației în Cargo.lock, nu și dependențele.
run('cargo update --workspace --offline', { cwd: 'src-tauri' });

run('git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock');
run(`git commit -m "chore(release): v${version}"`);
run(`git tag v${version}`);

console.log(`
✓ Gata: commit + tag v${version} create local.

Pentru a publica:
  git push origin main v${version}

GitHub Actions construiește apoi installerele (Windows + macOS) și publică
release-ul automat când toate sunt gata; utilizatorii primesc update-ul în app.
`);
