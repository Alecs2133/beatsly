-- ============================================================================
-- Beats.ly — Securizare roluri + credite
-- ============================================================================
-- Rezolvă:
--   1. Escaladare de privilegii: rolul era citit din `user_metadata`, pe care
--      utilizatorul și-l poate scrie singur (`auth.updateUser({ data: {...} })`).
--      Rolul se mută în `public.profiles.role`, blocat la scriere din client.
--   2. Credite/tier scriptibile din client: `profiles` permitea update pe tot
--      rândul, deci userul putea seta `credits` sau `tier` la orice valoare.
--   3. Refill zilnic executat din client.
--
-- Migrarea este idempotentă: poate fi rulată de mai multe ori fără efecte
-- secundare. Nu presupune nimic despre policies-urile existente — le enumeră
-- din `pg_policies` și le șterge înainte de a le recrea.
-- ============================================================================

set local check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 0. Precondiție: schema de bază
-- ---------------------------------------------------------------------------
-- Eșuează din prima, cu lista completă, în loc să pice la a treia instrucțiune
-- pe o tabelă lipsă.

do $$
declare
  v_missing text[];
begin
  select array_agg(t)
  into v_missing
  from unnest(array[
    'profiles', 'sounds', 'user_libraries', 'role_requests', 'notifications'
  ]) as t
  where to_regclass('public.' || t) is null;

  if v_missing is not null then
    raise exception
      'Lipsesc tabele: %. Rulează întâi 20260819115900_baseline_schema.sql.',
      array_to_string(v_missing, ', ')
      using errcode = '42P01';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Coloana `role` pe profiles + backfill din user_metadata
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text not null default 'USER';

-- Backfill o singură dată, din rolul existent în auth.users.
-- Rulează doar pentru rândurile rămase pe default, ca să nu suprascrie
-- rolurile deja migrate dacă migrarea se rulează a doua oară.
-- Doar valorile din setul permis. Un rol necunoscut în user_metadata
-- (ex. 'admin', scris de mână) ar face CHECK-ul de mai jos să pice, așa că
-- îl ignorăm și contul rămâne pe 'USER'.
update public.profiles p
set role = upper(trim(u.raw_user_meta_data ->> 'role'))
from auth.users u
where u.id = p.id
  and p.role = 'USER'
  and upper(trim(coalesce(u.raw_user_meta_data ->> 'role', ''))) in (
    'PRODUCER', 'VIDEO MAKER', 'EDITOR', 'SOUND ENGINEER', 'ARTIST',
    'PRODUCER ADMIN', 'OWNER'
  );

-- Normalizăm orice variantă de scriere rămasă.
update public.profiles
set role = upper(trim(role))
where role is distinct from upper(trim(role));

update public.profiles
set role = 'USER'
where role is null or role = '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in (
        'USER',
        'PRODUCER',
        'VIDEO MAKER',
        'EDITOR',
        'SOUND ENGINEER',
        'ARTIST',
        'PRODUCER ADMIN',
        'OWNER'
      ));
  end if;
end $$;

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- 2. Funcții helper pentru verificarea rolului
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER ca să poată citi `profiles` fără să declanșeze recursiv
-- policies-urile de pe `profiles` (altfel: infinite recursion in policy).

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'USER'
  );
$$;

-- Admin = poate modera sunete, aproba cereri de rol, șterge conținut.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select public.current_app_role() in ('PRODUCER ADMIN', 'OWNER');
$$;

-- Publisher = poate urca sunete în cloud (ajung cu status 'pending').
-- NOTĂ: păstrăm exact setul din codul actual. 'EDITOR', 'SOUND ENGINEER' și
-- 'ARTIST' pot fi cerute din Pricing.tsx, dar nu acordă încă niciun drept —
-- decizie de produs, nu o lărgim silențios aici.
create or replace function public.is_publisher()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select public.current_app_role() in (
    'PRODUCER', 'VIDEO MAKER', 'PRODUCER ADMIN', 'OWNER'
  );
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_publisher() from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_publisher() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Trigger-gardă: blochează scrierea coloanelor privilegiate din client
-- ---------------------------------------------------------------------------
-- Apărare în profunzime, peste GRANT-urile pe coloane de la pasul 4.
-- Funcțiile SECURITY DEFINER de mai jos ridică flag-ul `app.privileged_write`
-- pe durata tranzacției ca să poată scrie legitim.

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  privileged boolean;
begin
  -- service_role / postgres (edge functions, webhook Stripe, dashboard) trec.
  -- nullif: 'request.jwt.claims' poate fi string gol, iar ''::jsonb aruncă
  -- excepție. Absent => apel din SQL editor / migrare / service_role.
  if nullif(current_setting('request.jwt.claims', true), '') is null
     or coalesce(
          nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
          ''
        ) = 'service_role'
  then
    return new;
  end if;

  privileged := coalesce(current_setting('app.privileged_write', true), 'off') = 'on';
  if privileged then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Coloana "role" nu poate fi modificată din client.'
      using errcode = '42501';
  end if;

  if new.tier is distinct from old.tier then
    raise exception 'Coloana "tier" nu poate fi modificată din client.'
      using errcode = '42501';
  end if;

  if new.credits is distinct from old.credits then
    raise exception 'Coloana "credits" nu poate fi modificată din client. Folosește deduct_credit().'
      using errcode = '42501';
  end if;

  if new.last_refill_date is distinct from old.last_refill_date then
    raise exception 'Coloana "last_refill_date" nu poate fi modificată din client.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'Coloana "id" nu poate fi modificată.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_privileged_columns on public.profiles;
create trigger guard_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- 4. Privilegii pe coloane: userul scrie doar câmpurile de profil
-- ---------------------------------------------------------------------------

revoke all on public.profiles from anon;
revoke update on public.profiles from authenticated;
grant update (username, first_name, last_name, phone_number)
  on public.profiles to authenticated;
grant select on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS — ștergem tot ce există și recreăm explicit
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'sounds', 'user_libraries', 'role_requests', 'notifications'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
  end loop;
end $$;

alter table public.profiles       enable row level security;
alter table public.sounds         enable row level security;
alter table public.user_libraries enable row level security;
alter table public.role_requests  enable row level security;
alter table public.notifications  enable row level security;

-- --- profiles ---------------------------------------------------------------
-- Citire: propriul profil, plus adminii văd tot (pentru panoul de moderare).
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Inserare: doar propriul rând. Coloanele privilegiate sunt forțate la default
-- prin WITH CHECK, ca userul să nu se poată auto-crea cu role/tier/credite.
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role = 'USER'
    and tier = 'free'
    and coalesce(credits, 0) <= 5
  );

-- Update: doar propriul rând. CE coloane se pot scrie e decis de GRANT-urile
-- de la pasul 4 + trigger-ul de la pasul 3.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Fără policy de DELETE: ștergerea profilului se face doar prin service_role.

-- --- sounds -----------------------------------------------------------------
-- Vizibilitate: ce e aprobat, plus propriile încărcări (ca autorul să-și vadă
-- sunetele cât sunt în moderare), plus tot, pentru admini.
create policy sounds_select_visible on public.sounds
  for select to authenticated
  using (
    status = 'approved'
    or owner_id = auth.uid()
    or public.is_admin()
  );

-- Doar publisherii pot urca, doar cu status 'pending', și doar în nume propriu.
-- `owner_id = auth.uid()` împiedică publicarea unui sunet atribuit altcuiva.
create policy sounds_insert_publisher on public.sounds
  for insert to authenticated
  with check (
    public.is_publisher()
    and status = 'pending'
    and owner_id = auth.uid()
  );

-- Proprietarul își editează propriile sunete.
--
-- ATENȚIE: policy-ul de aici decide doar PE CARE RÂNDURI se poate scrie, nu ce
-- coloane. Fără o restricție suplimentară, proprietarul și-ar putea seta
-- `status = 'approved'` și s-ar auto-aproba, ocolind moderarea. Coloanele
-- privilegiate sunt blocate de trigger-ul `guard_sound_privileged_columns`,
-- definit în 20260819120300 (după ce există `storage_path` și `preview_url`).
create policy sounds_update_own on public.sounds
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy sounds_update_admin on public.sounds
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy sounds_delete_own on public.sounds
  for delete to authenticated
  using (owner_id = auth.uid());

create policy sounds_delete_admin on public.sounds
  for delete to authenticated
  using (public.is_admin());

-- --- user_libraries ---------------------------------------------------------
create policy user_libraries_select_own on public.user_libraries
  for select to authenticated
  using (user_id = auth.uid());

create policy user_libraries_insert_own on public.user_libraries
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_libraries_delete_own on public.user_libraries
  for delete to authenticated
  using (user_id = auth.uid());

-- --- role_requests ----------------------------------------------------------
create policy role_requests_select_own on public.role_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Userul își depune propria cerere, obligatoriu 'pending'.
create policy role_requests_insert_own on public.role_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy role_requests_update_admin on public.role_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy role_requests_delete_admin on public.role_requests
  for delete to authenticated
  using (public.is_admin());

-- --- notifications ----------------------------------------------------------
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Userul poate doar marca drept citit (coloană restricționată prin GRANT).
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_insert_admin on public.notifications
  for insert to authenticated
  with check (public.is_admin());

revoke all on public.notifications from anon;
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Consum de credite — server-side
-- ---------------------------------------------------------------------------
-- Înlocuiește update-ul din client (`useAuthStore.deductCredit`).
-- Returnează creditele rămase, sau -1 dacă e nelimitat, și ridică excepție
-- dacă nu sunt suficiente credite.

create or replace function public.deduct_credit()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid   uuid := auth.uid();
  v_tier  text;
  v_role  text;
  v_left  integer;
begin
  if v_uid is null then
    raise exception 'Neautentificat.' using errcode = '42501';
  end if;

  -- FOR UPDATE serializează cererile concurente pe același user.
  select tier, role into v_tier, v_role
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    raise exception 'Profil inexistent.' using errcode = 'P0002';
  end if;

  -- Nelimitat pentru ultimate și OWNER.
  if v_tier = 'ultimate' or v_role = 'OWNER' then
    return -1;
  end if;

  perform set_config('app.privileged_write', 'on', true);

  update public.profiles
  set credits = credits - 1
  where id = v_uid and credits > 0
  returning credits into v_left;

  perform set_config('app.privileged_write', 'off', true);

  if v_left is null then
    raise exception 'Credite insuficiente.' using errcode = 'P0001';
  end if;

  return v_left;
end;
$$;

revoke all on function public.deduct_credit() from public;
grant execute on function public.deduct_credit() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Refill zilnic — server-side, idempotent pe zi
-- ---------------------------------------------------------------------------
-- Înlocuiește logica din `fetchAndProcessProfile`. Apelabilă la fiecare
-- pornire de app: dacă refill-ul de azi s-a făcut deja, nu schimbă nimic.

create or replace function public.claim_daily_refill()
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
  v_target  integer;
begin
  if v_uid is null then
    raise exception 'Neautentificat.' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;

  if not found then
    raise exception 'Profil inexistent.' using errcode = 'P0002';
  end if;

  if v_profile.last_refill_date = current_date then
    return v_profile;
  end if;

  -- Cuantumurile trebuie să corespundă textelor din Pricing.tsx / FAQ site.
  v_target := case v_profile.tier
    when 'free'     then 3
    when 'producer' then 30
    else null            -- ultimate: nelimitat, nu folosește credite
  end;

  perform set_config('app.privileged_write', 'on', true);

  update public.profiles
  set credits = case
        when v_target is null then credits
        when credits < v_target then v_target
        else credits          -- nu tăiem creditele cumpărate
      end,
      last_refill_date = current_date
  where id = v_uid
  returning * into v_profile;

  perform set_config('app.privileged_write', 'off', true);

  return v_profile;
end;
$$;

revoke all on function public.claim_daily_refill() from public;
grant execute on function public.claim_daily_refill() to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Aprobarea cererilor de rol — scrie profiles.role, nu user_metadata
-- ---------------------------------------------------------------------------

create or replace function public.approve_role_request(
  req_id uuid,
  req_user_id uuid,
  granted_role text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_role text := upper(trim(granted_role));
begin
  if not public.is_admin() then
    raise exception 'Doar administratorii pot aproba cereri de rol.'
      using errcode = '42501';
  end if;

  if v_role not in (
    'PRODUCER', 'VIDEO MAKER', 'EDITOR', 'SOUND ENGINEER', 'ARTIST'
  ) then
    raise exception 'Rol invalid: %', granted_role using errcode = '22023';
  end if;

  perform set_config('app.privileged_write', 'on', true);

  update public.profiles set role = v_role where id = req_user_id;

  perform set_config('app.privileged_write', 'off', true);

  update public.role_requests
  set status = 'approved'
  where id = req_id;

  insert into public.notifications (user_id, title, message, type)
  values (
    req_user_id,
    'Role Request Approved',
    format('Felicitări! Contul tău are acum rolul %s.', v_role),
    'role'
  );
end;
$$;

revoke all on function public.approve_role_request(uuid, uuid, text) from public;
grant execute on function public.approve_role_request(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Profil automat la înregistrare
-- ---------------------------------------------------------------------------
-- Elimină nevoia ca frontend-ul să-și creeze singur profilul (drum pe care
-- userul putea insera valori alese de el).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.profiles (id, tier, credits, last_refill_date, role)
  values (new.id, 'free', 3, current_date, 'USER')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
