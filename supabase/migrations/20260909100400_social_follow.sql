-- ============================================================================
-- Beats.ly — Profil public + follow
-- ============================================================================
-- Singurul concept de identitate cross-user care exista până acum era Crews,
-- strict privat. Asta adaugă un strat public minimal: oricine poate vedea
-- username-ul unui producător, câte sunete publice are, și poate să-l
-- urmărească — fără bio/avatar/feed, doar identitate + follow.
--
-- `profiles_select_own` (migrarea de securitate) blochează citirea directă a
-- username-ului altcuiva — de-aia `get_public_profile` există, la fel ca
-- `get_crew_members` pentru Crews.
-- ============================================================================

create table if not exists public.follows (
  follower_id uuid        not null references auth.users (id) on delete cascade,
  followed_id uuid        not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index if not exists follows_followed_id_idx on public.follows (followed_id);

alter table public.follows enable row level security;

-- Graful de follow e informație publică (cine urmărește pe cine), la fel ca
-- pe orice platformă socială — necesar și ca să calculăm contoare corect.
create policy follows_select_all on public.follows
  for select to authenticated, anon
  using (true);

create policy follows_insert_own on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid());

create policy follows_delete_own on public.follows
  for delete to authenticated
  using (follower_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Profil public — doar ce e sigur de arătat oricui
-- ---------------------------------------------------------------------------

create or replace function public.get_public_profile(p_user_id uuid)
returns table (
  user_id uuid,
  username text,
  sound_count bigint,
  follower_count bigint,
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
-- Notificare: sunet nou de la cineva pe care îl urmărești
-- ---------------------------------------------------------------------------
-- Momentul relevant e aprobarea (status -> approved), nu upload-ul brut —
-- înainte de asta sunetul nu există public pentru nimeni.

create or replace function public.notify_followers_on_sound_approved()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.notifications (user_id, title, message, type)
  select
    f.follower_id,
    'New sound from someone you follow',
    format('%s just published "%s".', coalesce(p.username, 'A producer you follow'), new.title),
    'follow'
  from public.follows f
  join public.profiles p on p.id = new.owner_id
  where f.followed_id = new.owner_id;

  return new;
end;
$$;

drop trigger if exists notify_followers_on_sound_approved on public.sounds;
create trigger notify_followers_on_sound_approved
  after update on public.sounds
  for each row
  when (
    new.status = 'approved'
    and old.status is distinct from 'approved'
    and new.crew_id is null
  )
  execute function public.notify_followers_on_sound_approved();

-- ---------------------------------------------------------------------------
-- Notificare: sunet nou într-un crew din care faci parte
-- ---------------------------------------------------------------------------

create or replace function public.notify_crew_upload()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.notifications (user_id, title, message, type)
  select
    cm.user_id,
    'New sound in your crew',
    format('"%s" was just shared in your crew.', new.title),
    'crew'
  from public.crew_members cm
  where cm.crew_id = new.crew_id
    and cm.user_id <> new.owner_id;

  return new;
end;
$$;

drop trigger if exists notify_crew_upload on public.sounds;
create trigger notify_crew_upload
  after insert on public.sounds
  for each row
  when (new.crew_id is not null)
  execute function public.notify_crew_upload();
