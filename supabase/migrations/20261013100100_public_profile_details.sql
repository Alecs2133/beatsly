-- ============================================================================
-- Beats.ly — Profil public: nume afișat, descriere, poză, link-uri
-- ============================================================================
-- Până acum profilul public avea doar `username` + contoare. Adăugăm
-- câmpurile pe care userul și le editează din pagina de profil (app + site).
--
-- Poza: păstrăm calea obiectului din bucket-ul `avatars` (`<user_id>/…`), nu un
-- URL. Cu un URL liber, oricine ar fi putut seta o imagine de pe orice
-- server — afișată apoi în aplicația altor useri (pixel de tracking, conținut
-- nemoderat de oriunde). Clientul construiește URL-ul public din cale.
-- ============================================================================

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio          text,
  add column if not exists avatar_path  text,
  add column if not exists social_links jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_len') then
    alter table public.profiles add constraint profiles_display_name_len
      check (display_name is null or char_length(display_name) between 1 and 50);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_bio_len') then
    alter table public.profiles add constraint profiles_bio_len
      check (bio is null or char_length(bio) <= 500);
  end if;

  -- Poza trebuie să fie în folderul propriu din `avatars`.
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_path_own') then
    alter table public.profiles add constraint profiles_avatar_path_own
      check (avatar_path is null or avatar_path like id::text || '/%');
  end if;

  -- Obiect simplu { website, instagram, youtube, soundcloud, spotify }, mic.
  if not exists (select 1 from pg_constraint where conname = 'profiles_social_links_shape') then
    alter table public.profiles add constraint profiles_social_links_shape
      check (jsonb_typeof(social_links) = 'object' and pg_column_size(social_links) <= 2048);
  end if;
end $$;

comment on column public.profiles.display_name is 'Numele afișat public. Dacă lipsește, se afișează username-ul.';
comment on column public.profiles.bio is 'Descrierea publică a profilului (max 500 caractere).';
comment on column public.profiles.avatar_path is 'Calea pozei în bucket-ul public `avatars`, mereu sub `<user_id>/`.';
comment on column public.profiles.social_links is 'Link-uri publice: { website, instagram, youtube, soundcloud, spotify }.';

grant update (display_name, bio, avatar_path, social_links) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Profilul public — extins cu câmpurile noi
-- ---------------------------------------------------------------------------
-- Tipul returnat se schimbă, deci `create or replace` nu ajunge: drop + create.

drop function if exists public.get_public_profile(uuid);

create function public.get_public_profile(p_user_id uuid)
returns table (
  user_id         uuid,
  username        text,
  display_name    text,
  bio             text,
  avatar_path     text,
  social_links    jsonb,
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
-- Bucket-ul `avatars`: public la citire, scriere doar în folderul propriu
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_select_own on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;

-- Citirea publică merge prin URL-ul public al bucket-ului, fără policy.
-- Policy-ul de select e doar pentru operațiile API pe propriile fișiere
-- (ștergerea pozei vechi are nevoie de el).
create policy avatars_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
