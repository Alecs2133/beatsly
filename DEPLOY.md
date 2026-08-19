# Deploy — ordinea operațiunilor

Schimbările de securitate ating simultan baza de date, edge functions și
aplicația desktop. Ordinea contează: aplicate în altă ordine, clienții aflați
pe versiuni vechi rămân fără descărcări sau fără redare.

Motivul: aplicația veche scrie direct în `profiles.credits` și citește
fișierele din URL-uri publice. Ambele căi se închid prin migrări.

---

## 0. Înainte de orice — rotația secretelor

Tokenii de mai jos au fost livrați în installerele publicate, prin variabile
`VITE_*`. Codul nou nu-i mai include, dar binarele deja distribuite îi conțin
și pot fi extrase din ele.

- [ ] Revocă tokenul HuggingFace (chiar dacă generarea AI nu e activă, tokenul
      a circulat public și poate fi folosit de altcineva pe contul tău)
- [ ] Revocă tokenul Replicate (nu era folosit în cod)
- [ ] Revocă tokenul Freesound (nu era folosit în cod)
- [ ] Șterge cele trei linii din `.env.local`

Nu e nevoie să generezi tokeni noi acum. Niciunul nu mai e folosit de aplicație,
iar cel de HuggingFace se setează abia când activezi generarea AI (vezi pasul 3).

CLI-ul e instalat ca dependință de proiect, nu global, deci toate comenzile
`supabase` se dau prin `npx`.

---

## 1. Audit — cine are privilegii acum

Rulează `supabase/audit_before_migration.sql` în SQL Editor. Se poate rula
integral, dintr-o bucată.

Verifică lista manual. Rolul se citea din `user_metadata`, pe care orice
utilizator autentificat și-l putea seta singur. Dacă apare un cont pe care nu
l-ai promovat tu, rolul a fost auto-atribuit — șterge-l înainte de pasul 2,
altfel backfill-ul îl păstrează.

---

## 2. Migrările de securitate

| Fișier | Ce face |
|---|---|
| `20260819115900_baseline_schema.sql` | `user_libraries`, `owner_id`, valori implicite, șterge o funcție moartă |
| `20260819120000_security_roles_and_credits.sql` | Rol în DB, RLS, credite server-side |
| `20260819120100_billing_idempotency.sql` | Acordare de credite atomică și idempotentă |
| `20260819120200_credit_refund.sql` | Returnarea creditului la eșec de generare |
| `20260819120300_sound_previews.sql` | Coloane + bucket de preview-uri |

A șasea migrare, `20260819120400_make_sounds_private.sql`, stă intenționat în
`supabase/migrations_deferred/`, ca să nu fie prinsă de `db push`. Se mută
înapoi abia la pasul 6.

### Varianta recomandată: CLI

```bash
npx supabase db push --linked
```

Merge fără Docker. Preferabilă față de SQL Editor din trei motive: aplică
migrările în ordine, fiecare în propria tranzacție (o eroare nu lasă în urmă
jumătate de migrare), și ține evidența celor deja aplicate în
`supabase_migrations.schema_migrations` — deci o rerulare sare peste ce s-a
făcut deja, în loc să încerce din nou.

Vezi întâi ce s-ar aplica, fără să scrii nimic:

```bash
npx supabase db push --linked --dry-run
```

### Varianta alternativă: SQL Editor

Copiază fiecare fișier, în ordinea numerelor. Rulează fiecare separat și
verifică rezultatul înainte de următorul.

Prima migrare e obligatorie indiferent de variantă: schema din cloud nu
conținea `user_libraries`, deși codul o interoghează. Fără ea, restul se opresc
cu `relation "public.user_libraries" does not exist`.

Verificare: rulează `supabase/audit_after_migration.sql`, tot integral.

- **Secțiunea 0** — toate rândurile trebuie să arate `true`. Dacă vreunul e
  `false`, migrarea corespunzătoare nu a trecut.
- **Secțiunea 3** — exact patru coloane: `first_name`, `last_name`,
  `phone_number`, `username`. Dacă apar `role`, `tier` sau `credits`, gaura
  e încă deschisă.
- **Secțiunea 6** — toate funcțiile privilegiate trebuie să arate `false`.

---

## 3. Edge functions

`--use-api` face bundling-ul pe serverele Supabase, deci nu ai nevoie de Docker
local. Fără el, comanda încearcă să pornească un container și eșuează.

### Necesare acum

`get-download-url` merge prima: după ce bucket-ul devine privat, e singura cale
către fișiere. Celelalte două susțin cumpărarea de credite, care e activă în
aplicație.

```bash
npx supabase functions deploy get-download-url --use-api && npx supabase functions deploy create-checkout --use-api && npx supabase functions deploy stripe-webhook --use-api
```

`get-download-url` folosește `SUPABASE_SERVICE_ROLE_KEY` pentru a semna URL-uri
și a returna creditul dacă semnarea eșuează. Este disponibil implicit în edge
functions Supabase, nu trebuie setat.

Verifică:

```bash
npx supabase functions list
```

### Amânat: generarea AI

`generate-audio` nu se deployează încă. Funcția de generare nu e activă în
produs — pagina Analyzer e acoperită integral de overlay-ul "Coming Soon", deci
nimic din aplicație nu o apelează.

Funcția e scrisă și gata. Când ai un token HuggingFace valid:

```bash
npx supabase secrets set HF_API_TOKEN=hf_tokenul_tau && npx supabase functions deploy generate-audio --use-api
```

Apoi scoate overlay-ul din `src/pages/Analyzer.tsx`.

Dacă funcția e deployată fără `HF_API_TOKEN` setat, răspunde `503` cu
"AI generation is not configured" în loc să crape sau să consume credite —
comportament intenționat, dar oricum inutil cât timp interfața e blocată.

---

## 4. Release-ul aplicației

Semnarea pentru auto-update cere două secrete în repository settings →
Secrets and variables → Actions:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Cheia publică corespunzătoare este deja în `src-tauri/tauri.conf.json`. Dacă
nu mai ai cheia privată, generează o pereche nouă cu
`npm run tauri signer generate` și înlocuiește `pubkey` din config — clienții
existenți nu vor putea face auto-update la acel release și vor avea nevoie de
o reinstalare manuală.

Apoi:

```bash
git tag v0.1.6 && git push origin v0.1.6
```

Workflow-ul creează un release **draft**. Publică-l manual din interfața
GitHub — până atunci `latest.json` nu este accesibil public, deci updater-ul
nu vede versiunea nouă.

Versiunea se bumpează într-un singur loc: `package.json`. `tauri.conf.json` o
citește de acolo, iar site-ul o injectează la build în link-urile de download.

---

## 5. Backfill-ul preview-urilor

În aplicație, ca `PRODUCER ADMIN` sau `OWNER`: **Admin → Sound Moderation →
Generate missing previews**.

Rulează cât timp bucket-ul `sounds` este încă public, fiindcă citește
fișierele existente prin URL-urile lor publice.

Așteaptă până contorul ajunge la zero. Verificare:

```sql
select count(*) from public.sounds where status = 'approved' and preview_url is null;
```

---

## 6. Închiderea bucket-ului

Abia acum mută migrarea deferată înapoi și aplic-o:

PowerShell (Windows):

```bash
Move-Item supabase\migrations_deferred\20260819120400_make_sounds_private.sql supabase\migrations\
```

Bash (macOS, Linux, Git Bash):

```bash
mv supabase/migrations_deferred/20260819120400_make_sounds_private.sql supabase/migrations/
```

Apoi, în ambele cazuri:

```bash
npx supabase db push --linked
```

Migrarea are un guard care refuză să pornească dacă mai există sunete aprobate
fără `preview_url` sau `storage_path`.

Din acest moment fișierele complete nu mai sunt accesibile public. Redarea
folosește preview-urile mp3, iar descărcarea trece exclusiv prin
`get-download-url`, care consumă creditul în aceeași cerere.

Rollback, dacă ceva merge prost:

```sql
update storage.buckets set public = true where id = 'sounds';
```

---

## Test de fum după deploy

Rulează `npm run tauri dev` și verifică, în ordine:

- [ ] Login și afișarea creditelor în bara de sus
- [ ] Redarea unui sunet din Discover (folosește `preview_url`)
- [ ] Descărcarea unui sunet — creditul scade cu exact 1
- [ ] Anularea dialogului de salvare — creditul **nu** scade
- [ ] Selectarea unui folder local și redarea de acolo (scope `asset:`)
- [ ] Drag & drop al unui fișier peste fereastră (comanda `allow_asset_path`)
- [ ] Publicarea unui sunet — se creează și preview-ul
- [ ] Butonul de cumpărare credite deschide Stripe în browser
- [ ] Consola webview-ului nu conține erori de CSP

Ultimele trei sunt cele mai probabile să scoată la iveală o intrare lipsă din
`capabilities/default.json`.

### Testul de fum NU acoperă CSP-ul de producție

`tauri dev` folosește `devCsp`, care e mai permisiv — altfel scriptul inline
injectat de Vite pentru hot-reload ar fi blocat și ai vedea ecran alb.

Asta înseamnă că o violare de CSP care apare doar în producție **nu se vede în
dev**. După ce testul de fum trece, construiește și pornește binarul real cel
puțin o dată:

```bash
npm run tauri build
```

Apoi rulează executabilul din `src-tauri/target/release/` și repetă redarea,
descărcarea și publicarea, cu consola deschisă. Abia atunci ai confirmarea că
`csp` (nu `devCsp`) e corect.
