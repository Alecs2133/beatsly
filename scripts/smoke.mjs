// Smoke test pentru producție, de rulat după un `db push`, un deploy de
// funcții sau un release:
//   npm run smoke
//
// Doar citiri și cereri respinse intenționat (fără login) — nu scrie nimic în
// baza de date și nu consumă credite. Citește VITE_SUPABASE_URL și
// VITE_SUPABASE_ANON_KEY din mediu sau din .env.local.
import { readFileSync } from 'node:fs';

const WEBSITE = 'https://beatsly.vercel.app';
const LATEST_JSON = 'https://github.com/Alecs2133/beatsly/releases/latest/download/latest.json';

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // fără .env.local — rămân variabilele de mediu
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Lipsesc VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (mediu sau .env.local).');
  process.exit(2);
}

const anonHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };
const results = [];

async function check(name, fn, { warnOnly = false } = {}) {
  try {
    await fn();
    results.push({ name, status: 'ok' });
  } catch (err) {
    results.push({ name, status: warnOnly ? 'warn' : 'fail', detail: err.message });
  }
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function readBody(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// --- Baza de date (REST, ca anonim) ---------------------------------------

// Tabelele pe care se bazează aplicația trebuie să existe (404 = migrare
// lipsă). RLS poate întoarce o listă goală, iar unele tabele nici n-au
// GRANT pentru anon (42501 "permission denied") — ambele înseamnă că tabela
// există.
for (const table of ['sounds', 'collections', 'collection_sounds', 'follows', 'crews', 'notifications']) {
  await check(`table ${table} exists`, async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, { headers: anonHeaders });
    expect(res.status !== 404, `HTTP 404 — tabela lipsește (migrare neaplicată?)`);
    const body = await readBody(res);
    expect(res.ok || body?.code === '42501', `HTTP ${res.status}: ${JSON.stringify(body)}`);
  });
}

// Tabele cu date sensibile: un anonim nu are voie să vadă niciun rând.
for (const table of ['app_auth_handoff', 'client_error_reports', 'role_requests']) {
  await check(`table ${table} hidden from anon`, async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, { headers: anonHeaders });
    expect(res.status !== 404, 'HTTP 404 — tabela lipsește');
    const body = await readBody(res);
    expect(!(Array.isArray(body) && body.length > 0), 'RLS SCURS: anonimul vede rânduri!');
  });
}

await check('rpc get_public_profile', async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_profile`, {
    method: 'POST',
    headers: { ...anonHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: '00000000-0000-0000-0000-000000000000' }),
  });
  expect(res.status !== 404, 'HTTP 404 — funcția lipsește sau i s-a schimbat semnătura');
  expect(res.ok, `HTTP ${res.status}: ${JSON.stringify(await readBody(res))}`);
});

// --- Edge functions --------------------------------------------------------

const fn = (name) => `${SUPABASE_URL}/functions/v1/${name}`;

// Fără Authorization, funcțiile noastre răspund singure cu `{ error }` 401.
// Dacă răspunde gateway-ul (`verify_jwt` reactivat la deploy), corpul are
// altă formă — exact problema care a stricat login-ul prin browser.
for (const name of ['get-download-url', 'submit-auth-code', 'create-checkout', 'create-portal-session']) {
  await check(`function ${name} deployed, verify_jwt off`, async () => {
    const res = await fetch(fn(name), { method: 'POST', headers: { apikey: ANON_KEY } });
    const body = await readBody(res);
    expect(res.status !== 404, 'HTTP 404 — funcția nu e deployată');
    expect(res.status === 401, `aștept 401, am primit ${res.status}`);
    expect(
      body && typeof body === 'object' && 'error' in body,
      `401 venit de la gateway, nu de la funcție (verify_jwt e pornit?): ${JSON.stringify(body)}`
    );
  });
}

// Generatorul AI e marcat „coming soon” (FEATURES.aiGenerator) și n-are încă
// HF_API_TOKEN — verifică tokenul înaintea autentificării, deci răspunde 503.
// Doar avertisment până activăm feature-ul.
await check(
  'function generate-audio configured',
  async () => {
    const res = await fetch(fn('generate-audio'), { method: 'POST', headers: { apikey: ANON_KEY } });
    const body = await readBody(res);
    expect(res.status !== 404, 'HTTP 404 — funcția nu e deployată');
    expect(res.status === 401, `HTTP ${res.status}: ${JSON.stringify(body)}`);
  },
  { warnOnly: true }
);

await check('function exchange-auth-code rejects bad codes', async () => {
  const res = await fetch(fn('exchange-auth-code'), {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'not-a-code' }),
  });
  expect(res.status === 400, `aștept 400, am primit ${res.status}: ${JSON.stringify(await readBody(res))}`);
});

await check('function stripe-webhook rejects unsigned calls', async () => {
  const res = await fetch(fn('stripe-webhook'), { method: 'POST', body: '{}' });
  expect(res.status === 400, `aștept 400, am primit ${res.status}`);
});

// --- Website ---------------------------------------------------------------

for (const path of ['/', '/app-login', '/email-confirmed', '/download']) {
  await check(`website ${path}`, async () => {
    const res = await fetch(`${WEBSITE}${path}`);
    expect(res.ok, `HTTP ${res.status}`);
  });
}

// --- Auto-update -----------------------------------------------------------

const appVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;

await check('updater latest.json is signed', async () => {
  const res = await fetch(LATEST_JSON);
  expect(res.ok, `HTTP ${res.status} — niciun release publicat (non-draft, non-prerelease) cu latest.json`);
  const manifest = await res.json();
  const platforms = Object.entries(manifest.platforms ?? {});
  expect(platforms.length > 0, 'latest.json nu are nicio platformă');
  for (const [platform, info] of platforms) {
    expect(info.signature && info.url, `${platform}: lipsește signature/url`);
  }
});

await check(
  `updater serves current version (${appVersion})`,
  async () => {
    const manifest = await (await fetch(LATEST_JSON)).json();
    expect(
      manifest.version?.replace(/^v/, '') === appVersion,
      `latest.json e la ${manifest.version} — draft-ul pentru v${appVersion} nu e publicat încă?`
    );
  },
  { warnOnly: true }
);

// --- Raport ----------------------------------------------------------------

const icon = { ok: '✓', warn: '!', fail: '✗' };
for (const r of results) {
  console.log(`${icon[r.status]} ${r.name}${r.detail ? `\n    ${r.detail}` : ''}`);
}
const failed = results.filter(r => r.status === 'fail').length;
const warned = results.filter(r => r.status === 'warn').length;
console.log(`\n${results.length - failed - warned} ok, ${warned} warnings, ${failed} failed`);
process.exit(failed ? 1 : 0);
