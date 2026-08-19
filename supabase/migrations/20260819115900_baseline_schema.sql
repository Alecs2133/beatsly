-- ============================================================================
-- Beats.ly — Baseline: aduce schema la ce presupune codul
-- ============================================================================
-- Se rulează PRIMA, înaintea migrărilor de securitate.
--
-- Schema din cloud diverge de ce așteaptă aplicația. Migrarea asta închide
-- diferențele, fiecare fiind un bug real în producție:
--
--   1. `user_libraries` nu există, dar `useLibraryStore` o interoghează.
--      Funcția "Save to My Sounds" eșuează silențios (doar console.error):
--      inima se colorează, iar la refresh nu mai e nimic salvat.
--
--   2. `profiles` nu are valori implicite. Clientul face `insert({ id })`,
--      deci `tier`, `credits` și `last_refill_date` rămân NULL. `credits - 1`
--      pe NULL dă NULL, iar politica de INSERT din migrarea următoare cere
--      `tier = 'free'` — ar respinge exact inserția pe care o face codul.
--
--   3. `notifications.is_read` e nullable fără default. "Mark all read"
--      filtrează pe `is_read = false`, care nu prinde rândurile NULL, iar în
--      JavaScript `!null` e adevărat — deci apar la nesfârșit ca necitite.
--
--   4. `sounds` nu are nicio legătură către cine a urcat fișierul.
--
--   5. `approve_producer_request` e o funcție rămasă din varianta veche,
--      neapelată de nicăieri în cod.
--
-- Idempotentă: se poate rula de mai multe ori.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Verificare: tabelele așteptate există?
-- ---------------------------------------------------------------------------
-- Eșuează din prima, cu lista completă, în loc să pice câte una pe rând.

do $$
declare
  v_missing text[];
begin
  select array_agg(t)
  into v_missing
  from unnest(array['profiles', 'sounds', 'role_requests', 'notifications']) as t
  where to_regclass('public.' || t) is null;

  if v_missing is not null then
    raise exception
      'Lipsesc tabele din schema de bază: %. Creează-le înainte de a continua.',
      array_to_string(v_missing, ', ')
      using errcode = '42P01';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 2. `user_libraries` — sunetele salvate de utilizator
-- ---------------------------------------------------------------------------
-- Cheia primară compusă face salvarea idempotentă: un dublu click pe inimă nu
-- mai poate crea două rânduri.

create table if not exists public.user_libraries (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  sound_id   uuid        not null references public.sounds (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, sound_id)
);

-- `fetchLibrary` filtrează pe user_id, acoperit de prefixul cheii primare.
-- Indexul de mai jos servește direcția inversă și ștergerile în cascadă.
create index if not exists user_libraries_sound_id_idx
  on public.user_libraries (sound_id);


-- ---------------------------------------------------------------------------
-- 3. Valori implicite pe coloanele pe care clientul nu le trimite
-- ---------------------------------------------------------------------------

alter table public.profiles
  alter column tier             set default 'free',
  alter column credits          set default 3,
  alter column last_refill_date set default current_date;

update public.profiles
set tier             = coalesce(tier, 'free'),
    credits          = coalesce(credits, 3),
    last_refill_date = coalesce(last_refill_date, current_date)
where tier is null
   or credits is null
   or last_refill_date is null;

alter table public.profiles
  alter column tier             set not null,
  alter column credits          set not null,
  alter column last_refill_date set not null;

-- `is_read` nullable însemna notificări veșnic necitite.
alter table public.notifications
  alter column is_read set default false;

update public.notifications set is_read = false where is_read is null;

alter table public.notifications
  alter column is_read set not null;

alter table public.notifications
  alter column created_at set default now();

-- Cererile de rol pornesc întotdeauna în așteptare.
alter table public.role_requests
  alter column status set default 'pending';

update public.role_requests set status = 'pending' where status is null;

-- Sunetele urcate intră în moderare.
alter table public.sounds
  alter column status set default 'pending';

update public.sounds set status = 'pending' where status is null;

-- Interogarea principală din Discover: filtrare pe status + ordonare descrescătoare.
create index if not exists sounds_status_created_at_idx
  on public.sounds (status, created_at desc);


-- ---------------------------------------------------------------------------
-- 4. Proprietarul unui sunet
-- ---------------------------------------------------------------------------
-- `sounds` nu avea nicio legătură către utilizatorul care a urcat fișierul —
-- doar `author`, text liber. Consecințe:
--   - un producător nu-și putea edita propriile sunete fără drepturi de admin;
--   - nu se putea ști cine a urcat ce, nici pentru moderare, nici pentru
--     eventuale plăți către creatori;
--   - `author` fiind text liber, oricine putea publica sub orice nume.
--
-- `on delete set null`: dacă un cont e șters, sunetele rămân publicate dar
-- devin orfane. Alternativa (`cascade`) ar șterge conținut aprobat.

alter table public.sounds
  add column if not exists owner_id uuid references auth.users (id) on delete set null;

comment on column public.sounds.owner_id is
  'Utilizatorul care a urcat sunetul. NULL pentru încărcările dinaintea acestei coloane.';

create index if not exists sounds_owner_id_idx on public.sounds (owner_id);

-- Backfill din singura legătură disponibilă: `author` vs `profiles.username`.
-- Doar potrivirile neambigue: dacă două conturi au același username nu avem
-- cum decide, deci lăsăm NULL.
--
-- Unicitatea o exprimăm printr-un NOT EXISTS, nu prin `group by ... having`.
-- Varianta cu agregare ar fi cerut `min(p.id)`, iar Postgres nu are agregatele
-- min/max pentru tipul uuid.
update public.sounds s
set owner_id = p.id
from public.profiles p
where s.owner_id is null
  and p.username is not null
  and trim(p.username) <> ''
  and lower(trim(s.author)) = lower(trim(p.username))
  and not exists (
    select 1
    from public.profiles other
    where other.id <> p.id
      and lower(trim(other.username)) = lower(trim(p.username))
  );

-- Raportăm ce a rămas neatribuit, ca să știi dacă merită corectat manual.
do $$
declare
  v_orphans integer;
  v_dupes   integer;
begin
  select count(*) into v_orphans from public.sounds where owner_id is null;

  select count(*) into v_dupes from (
    select 1
    from public.profiles
    where username is not null and trim(username) <> ''
    group by lower(trim(username))
    having count(*) > 1
  ) d;

  if v_orphans > 0 then
    raise notice
      'ATENTIE: % sunete au ramas fara owner_id. Adminii le pot edita si sterge; proprietarii nu.',
      v_orphans;
  end if;

  if v_dupes > 0 then
    raise notice
      'ATENTIE: % username-uri sunt folosite de mai multe conturi; sunetele lor nu au putut fi atribuite.',
      v_dupes;
  end if;
end $$;

-- Username-ul e numele public sub care apar sunetele, deci ar trebui să fie
-- unic — altfel cineva se poate da drept alt producător. Nu forțăm asta dacă
-- există deja duplicate: migrarea ar pica, iar rezolvarea lor e o decizie
-- umană, nu automată.
do $$
begin
  if exists (
    select 1
    from public.profiles
    where username is not null and trim(username) <> ''
    group by lower(trim(username))
    having count(*) > 1
  ) then
    raise notice
      'Indexul unic pe username NU a fost creat: exista duplicate. Rezolva-le, apoi creeaza-l manual.';
  else
    create unique index if not exists profiles_username_unique_idx
      on public.profiles (lower(trim(username)))
      where username is not null and trim(username) <> '';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 5. Ștergerea funcției moarte `approve_producer_request`
-- ---------------------------------------------------------------------------
-- Rămășiță din varianta anterioară a fluxului de aprobare, neapelată de
-- nicăieri în cod. O ștergem pentru că, dacă era SECURITY DEFINER și
-- executabilă de `authenticated` — cum sunt implicit funcțiile din `public` —
-- orice utilizator autentificat o putea apela direct prin PostgREST ca să-și
-- acorde singur rolul de producător. Este a doua cale de escaladare, distinctă
-- de cea prin `user_metadata`.
--
-- Dacă vrei să-i vezi corpul înainte de ștergere, rulează separat:
--   select prosrc from pg_proc where proname = 'approve_producer_request';

drop function if exists public.approve_producer_request(uuid, uuid);
