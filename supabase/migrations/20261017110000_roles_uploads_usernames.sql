-- ============================================================================
-- Beats.ly — Upload direct pentru admini, rol public (badge), username la
-- înregistrare
-- ============================================================================
-- 1. Adminii pot urca sunete direct ca „approved” — fără să treacă prin
--    propria coadă de moderare. Ceilalți publisheri rămân pe „pending”.
-- 2. `get_public_profile` întoarce și rolul, ca profilul public să poată
--    afișa bifa de verificare (și badge-ul special al OWNER-ului).
-- 3. Username-ul ales la înregistrare ajunge în profil. Până acum era trimis
--    în metadata contului, dar trigger-ul nu-l copia niciodată — conturile
--    noi rămâneau fără username. Plus un backfill pentru cele existente și o
--    funcție care verifică dacă un username e liber, înainte de înregistrare.
--
-- Idempotentă: se poate rula de mai multe ori.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Upload direct pentru admini
-- ---------------------------------------------------------------------------
drop policy if exists sounds_insert_admin on public.sounds;
create policy sounds_insert_admin on public.sounds
  for insert to authenticated
  with check (
    public.is_admin()
    and owner_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 2. Rolul în profilul public
-- ---------------------------------------------------------------------------
drop function if exists public.get_public_profile(uuid);

create function public.get_public_profile(p_user_id uuid)
returns table (
  user_id         uuid,
  username        text,
  display_name    text,
  bio             text,
  avatar_path     text,
  social_links    jsonb,
  role            text,
  sound_count     bigint,
  follower_count  bigint,
  following_count bigint
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_path,
    p.social_links,
    p.role,
    (select count(*) from public.sounds s
       where s.owner_id = p.id and s.status = 'approved' and s.crew_id is null),
    (select count(*) from public.follows f where f.followed_id = p.id),
    (select count(*) from public.follows f where f.follower_id = p.id)
  from public.profiles p
  where p.id = p_user_id;
$$;

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 3. Username la înregistrare
-- ---------------------------------------------------------------------------
-- Aceeași regulă ca în formular: 3–24 caractere, litere, cifre, punct, underscore.
create or replace function public.is_valid_username(p_username text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_username ~ '^[A-Za-z0-9._]{3,24}$', false);
$$;

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select public.is_valid_username(trim(p_username))
     and not exists (
       select 1 from public.profiles
       where lower(trim(username)) = lower(trim(p_username))
     );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  -- Un username invalid sau deja luat nu blochează crearea contului — rămâne
  -- gol, iar aplicația îi cere userului să-și aleagă unul la prima pornire.
  if v_username is not null
     and (not public.is_valid_username(v_username)
          or exists (select 1 from public.profiles where lower(trim(username)) = lower(v_username)))
  then
    v_username := null;
  end if;

  insert into public.profiles (id, tier, credits, last_refill_date, role, username)
  values (new.id, 'free', 3, current_date, 'USER', v_username)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill: conturile create până acum își primesc username-ul din metadata,
-- unde e valid și nu e luat de altcineva (primul cont câștigă la egalitate).
update public.profiles p
set username = m.username
from (
  select distinct on (lower(trim(u.raw_user_meta_data ->> 'username')))
    u.id,
    trim(u.raw_user_meta_data ->> 'username') as username
  from auth.users u
  where public.is_valid_username(trim(u.raw_user_meta_data ->> 'username'))
  order by lower(trim(u.raw_user_meta_data ->> 'username')), u.created_at
) m
where p.id = m.id
  and (p.username is null or trim(p.username) = '')
  and not exists (
    select 1 from public.profiles o
    where o.id <> p.id and lower(trim(o.username)) = lower(m.username)
  );
