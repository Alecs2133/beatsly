-- ============================================================================
-- Beats.ly — Crews: partajare privată de sunete pentru Ultimate
-- ============================================================================
-- Un "crew" e un grup mic, privat: proprietarul (trebuie să fie Ultimate în
-- momentul creării) adaugă membri după username. Sunetele urcate într-un
-- crew NU trec prin moderarea publică și NU apar niciodată în Discover —
-- sunt vizibile doar membrilor acelui crew. Membrii pot fi de orice tier;
-- doar CREAREA grupului e gated la Ultimate, nu apartenența la el — cineva
-- pe Free poate fi invitat de un prieten Ultimate.
--
-- Scop deliberat restrâns pentru v1:
--   - fără flux de invitații cu accept/refuz — proprietarul adaugă direct
--     după username, fără confirmare din partea celui adăugat;
--   - fără UI de redenumire sau ștergere a unui crew;
--   - fără "leave crew" (auto-eliminare) — doar proprietarul elimină membri.
-- Toate trei sunt urmări rezonabile, nu limitări ascunse.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Precondiție
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.sounds') is null or to_regclass('public.profiles') is null then
    raise exception 'Lipsesc tabele de bază. Rulează migrările anterioare întâi.'
      using errcode = '42P01';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Tabele
-- ---------------------------------------------------------------------------

create table if not exists public.crews (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null check (char_length(trim(name)) between 1 and 60),
  owner_id   uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_members (
  crew_id   uuid        not null references public.crews (id) on delete cascade,
  user_id   uuid        not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create index if not exists crew_members_user_id_idx on public.crew_members (user_id);

-- `on delete cascade`: conținutul unui crew n-are sens fără crew — dacă
-- grupul dispare (nu există încă UI pentru asta, dar la nivel de schemă
-- trebuie să se comporte corect), sunetele lui private dispar odată cu el.
-- Fișierele din storage NU se șterg automat — aceeași limitare există deja
-- pentru orice altă ștergere din storage în aplicație, nu e ceva nou introdus
-- aici.
alter table public.sounds
  add column if not exists crew_id uuid references public.crews (id) on delete cascade;

comment on column public.sounds.crew_id is
  'Dacă e setat, sunetul e privat — vizibil doar membrilor acestui crew, niciodată în Discover, indiferent de status.';

create index if not exists sounds_crew_id_idx on public.sounds (crew_id) where crew_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Funcții helper
-- ---------------------------------------------------------------------------

create or replace function public.is_crew_member(p_crew_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.crew_members
    where crew_id = p_crew_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_crew_owner(p_crew_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.crews
    where id = p_crew_id and owner_id = auth.uid()
  );
$$;

revoke all on function public.is_crew_member(uuid) from public;
revoke all on function public.is_crew_owner(uuid) from public;
grant execute on function public.is_crew_member(uuid) to authenticated;
grant execute on function public.is_crew_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Crearea unui crew — doar Ultimate, doar prin această funcție
-- ---------------------------------------------------------------------------
-- Nu există INSERT direct pe `crews` pentru `authenticated` (vezi secțiunea
-- RLS) — verificarea de tier ar trebui altfel duplicată într-un WITH CHECK
-- separat, cu risc să scape neactualizată dacă regulile de tier se schimbă.
-- Un singur loc care decide cine poate crea un crew.

create or replace function public.create_crew(p_name text)
returns public.crews
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid   uuid := auth.uid();
  v_tier  text;
  v_role  text;
  v_crew  public.crews;
begin
  if v_uid is null then
    raise exception 'Neautentificat.' using errcode = '42501';
  end if;

  select tier, role into v_tier, v_role from public.profiles where id = v_uid;

  -- Aceeași regulă ca `hasUnlimitedCredits` din frontend (src/lib/roles.ts):
  -- OWNER e tratat ca superset al Ultimate peste tot în aplicație — ar fi
  -- inconsistent ca exact aici să nu fie.
  if v_tier is distinct from 'ultimate' and v_role is distinct from 'OWNER' then
    raise exception 'Doar membrii Ultimate pot crea un crew.' using errcode = '42501';
  end if;

  insert into public.crews (name, owner_id)
  values (trim(p_name), v_uid)
  returning * into v_crew;

  insert into public.crew_members (crew_id, user_id)
  values (v_crew.id, v_uid);

  return v_crew;
end;
$$;

revoke all on function public.create_crew(text) from public;
grant execute on function public.create_crew(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Administrarea membrilor — doar proprietarul
-- ---------------------------------------------------------------------------

create or replace function public.add_crew_member(p_crew_id uuid, p_username text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_target uuid;
begin
  if not public.is_crew_owner(p_crew_id) then
    raise exception 'Doar proprietarul crew-ului poate adăuga membri.' using errcode = '42501';
  end if;

  select id into v_target
  from public.profiles
  where lower(trim(username)) = lower(trim(p_username));

  if v_target is null then
    raise exception 'Niciun utilizator cu username-ul "%".', p_username using errcode = 'P0002';
  end if;

  insert into public.crew_members (crew_id, user_id)
  values (p_crew_id, v_target)
  on conflict (crew_id, user_id) do nothing;
end;
$$;

create or replace function public.remove_crew_member(p_crew_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_crew_owner(p_crew_id) then
    raise exception 'Doar proprietarul crew-ului poate elimina membri.' using errcode = '42501';
  end if;

  if p_user_id = (select owner_id from public.crews where id = p_crew_id) then
    raise exception 'Proprietarul nu poate fi eliminat din propriul crew.' using errcode = '42501';
  end if;

  delete from public.crew_members
  where crew_id = p_crew_id and user_id = p_user_id;
end;
$$;

revoke all on function public.add_crew_member(uuid, text) from public;
revoke all on function public.remove_crew_member(uuid, uuid) from public;
grant execute on function public.add_crew_member(uuid, text) to authenticated;
grant execute on function public.remove_crew_member(uuid, uuid) to authenticated;

-- `profiles_select_own` (din migrarea de bază) permite fiecărui user să-și
-- vadă DOAR propriul rând — corect acolo, dar înseamnă că un membru de crew
-- n-ar putea citi username-urile CELORLALȚI membri printr-un query direct pe
-- `profiles`, RLS le-ar filtra tăcut. Funcția asta expune explicit doar
-- username-ul, doar pentru membrii aceluiași crew ca apelantul.
create or replace function public.get_crew_members(p_crew_id uuid)
returns table (user_id uuid, username text, joined_at timestamptz, is_owner boolean)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select cm.user_id, p.username, cm.joined_at, (cm.user_id = c.owner_id)
  from public.crew_members cm
  join public.profiles p on p.id = cm.user_id
  join public.crews c on c.id = cm.crew_id
  where cm.crew_id = p_crew_id
    and public.is_crew_member(p_crew_id);
$$;

revoke all on function public.get_crew_members(uuid) from public;
grant execute on function public.get_crew_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS pe crews / crew_members
-- ---------------------------------------------------------------------------
-- Fără INSERT/UPDATE/DELETE direct pentru `authenticated` pe niciuna din
-- cele două tabele — orice scriere trece prin funcțiile de mai sus, care țin
-- verificarea de tier/proprietate într-un singur loc.

alter table public.crews        enable row level security;
alter table public.crew_members enable row level security;

do $$
declare
  r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('crews', 'crew_members')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy crews_select_member on public.crews
  for select to authenticated
  using (public.is_crew_member(id));

create policy crew_members_select_same_crew on public.crew_members
  for select to authenticated
  using (public.is_crew_member(crew_id));

-- ---------------------------------------------------------------------------
-- 6. Extindem vizibilitatea și scrierea pe `sounds` pentru conținut de crew
-- ---------------------------------------------------------------------------
-- Politicile noi sunt ADITIVE (nu înlocuiesc nimic din migrarea de securitate
-- de bază) — RLS combină mai multe politici SELECT/INSERT pentru aceeași
-- comandă prin OR, deci un rând trece dacă ORICE politică îl permite.

drop policy if exists sounds_select_visible on public.sounds;
create policy sounds_select_visible on public.sounds
  for select to authenticated
  using (
    (crew_id is null and (status = 'approved' or owner_id = auth.uid() or public.is_admin()))
    or (crew_id is not null and public.is_crew_member(crew_id))
  );

create policy sounds_insert_crew on public.sounds
  for insert to authenticated
  with check (
    crew_id is not null
    and owner_id = auth.uid()
    and public.is_crew_member(crew_id)
    -- Statusul nu are sens pentru conținut de crew (moderarea e un concept
    -- public), dar `status = 'pending'` ar face rândul vizibil în coada de
    -- moderare a adminilor (Admin.tsx filtrează după status, nu după
    -- crew_id) — deci fixăm-l la 'approved', ca nu cumva conținut privat de
    -- crew să ajungă în fața moderatorilor publici.
    and status = 'approved'
  );

-- `sounds_update_own`/`sounds_delete_own`, definite deja în migrarea de
-- securitate de bază, verifică doar `owner_id = auth.uid()` — funcționează
-- neschimbate și pentru sunete de crew, fără nicio ajustare aici.

-- ---------------------------------------------------------------------------
-- 7. Garda de coloane privilegiate pe `sounds`: adăugăm `crew_id`
-- ---------------------------------------------------------------------------
-- Fără asta, proprietarul unui sunet de crew și-ar putea muta singur
-- sunetul într-un ALT crew din care face parte (sau l-ar putea "publica"
-- public, golind crew_id) — un UPDATE, nu un INSERT nou, deci ar ocoli
-- politica de INSERT de mai sus, care verifică apartenența doar la creare.

create or replace function public.guard_sound_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if nullif(current_setting('request.jwt.claims', true), '') is null
     or coalesce(
          nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
          ''
        ) = 'service_role'
  then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'Doar moderatorii pot schimba statusul unui sunet.'
      using errcode = '42501';
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'Proprietarul unui sunet nu poate fi schimbat.'
      using errcode = '42501';
  end if;

  if new.crew_id is distinct from old.crew_id then
    raise exception 'Un sunet nu poate fi mutat între crew-uri sau făcut public după publicare.'
      using errcode = '42501';
  end if;

  if new.file_url     is distinct from old.file_url
     or new.storage_path is distinct from old.storage_path
     or new.preview_url  is distinct from old.preview_url
  then
    raise exception 'Fișierele unui sunet nu pot fi rescrise din client.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Storage: uploadul nu mai cere rol de Publisher global
-- ---------------------------------------------------------------------------
-- Politicile existente (`sounds_object_insert`, `sound_previews_insert`)
-- cereau `is_publisher()` — corect pentru fluxul public, dar ar bloca un
-- membru de crew pe Free (invitat de un prieten Ultimate) să încarce un
-- fișier în propriul crew privat.
--
-- Rezolvare: gatekeeping-ul real se mută unde trebuie să fie — la INSERT pe
-- tabela `sounds` (politicile `sounds_insert_publisher` / `sounds_insert_crew`
-- de mai sus), nu la nivel de storage. Un obiect scris în storage fără un
-- rând corespunzător în `sounds` e un fișier orfan inofensiv — nimeni nu-l
-- poate descoperi sau descărca fără o cale expusă printr-un rând `sounds`
-- (descărcarea trece prin `get-download-url`, care rezolvă calea din tabelă,
-- nu prin listarea storage-ului). La nivel de storage e suficient să
-- garantăm că fiecare user scrie DOAR în propriul folder.

drop policy if exists sounds_object_insert on storage.objects;
create policy sounds_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sounds'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists sound_previews_insert on storage.objects;
create policy sound_previews_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sound-previews'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 9. get_sound_storage_path: rezolvă și pentru sunete de crew, fără credit
-- ---------------------------------------------------------------------------
-- Versiunea anterioară verifica doar `status = 'approved'` — pentru un sunet
-- de crew asta n-ar fi găsit nimic (statusul e irelevant acolo), și oricum ar
-- fi trecut prin `deduct_credit()` necondiționat. Un membru pe Free, invitat
-- într-un crew Ultimate, nu trebuie să-și ardă cele 3 credite zilnice ca să
-- descarce fișierele propriei echipe — de-asta creditul se scade DOAR
-- pentru sunete publice, deciziune luată aici, nu în edge function.
--
-- Semnătura se schimbă (parametru nou) — `create or replace` nu înlocuiește
-- o funcție cu altă listă de parametri, la fel ca la apply_subscription_tier
-- din migrarea Stripe. Ștergem explicit versiunea veche.

drop function if exists public.get_sound_storage_path(uuid);

create or replace function public.get_sound_storage_path(
  p_sound_id uuid,
  p_requesting_user uuid
)
returns table (storage_path text, is_crew boolean)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select s.storage_path, (s.crew_id is not null)
  from public.sounds s
  where s.id = p_sound_id
    and (
      (s.crew_id is null and s.status = 'approved')
      or (
        s.crew_id is not null
        and exists (
          select 1 from public.crew_members cm
          where cm.crew_id = s.crew_id and cm.user_id = p_requesting_user
        )
      )
    );
$$;

revoke all on function public.get_sound_storage_path(uuid, uuid) from public;
revoke execute on function public.get_sound_storage_path(uuid, uuid) from anon, authenticated;
grant execute on function public.get_sound_storage_path(uuid, uuid) to service_role;
