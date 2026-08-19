-- ============================================================================
-- Beats.ly — Preview public + fișier complet privat
-- ============================================================================
-- Problema: bucket-ul `sounds` este public, deci `file_url` se poate descărca
-- direct, fără credit. Gate-ul de credite era pur cosmetic.
--
-- Soluția, în doi timpi:
--   - `sound-previews` (public): variantă mp3 de calitate redusă, folosită
--     pentru audiție în grilă. Inutilizabilă ca sample de producție.
--   - `sounds` (devine privat): WAV-ul complet, accesibil doar prin signed URL
--     emis de edge function-ul `get-download-url`, după deducerea creditului.
--
-- ATENȚIE la ordine: migrarea ASTA nu schimbă vizibilitatea bucket-ului
-- `sounds`. Trecerea la privat e într-o migrare separată
-- (20260819120400_make_sounds_private.sql), de aplicat DUPĂ ce previews-urile
-- au fost generate și build-ul nou a fost livrat.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Coloane noi pe `sounds`
-- ---------------------------------------------------------------------------

alter table public.sounds
  add column if not exists storage_path text,
  add column if not exists preview_url  text;

comment on column public.sounds.storage_path is
  'Cheia obiectului în bucket-ul privat `sounds`. Sursa pentru signed URL.';
comment on column public.sounds.preview_url is
  'URL public către preview-ul mp3 din bucket-ul `sound-previews`.';

-- Backfill: extragem cheia obiectului din URL-ul public existent.
update public.sounds
set storage_path = regexp_replace(
      file_url, '^.*/storage/v1/object/public/sounds/', ''
    )
where storage_path is null
  and file_url like '%/storage/v1/object/public/sounds/%';

create index if not exists sounds_storage_path_idx
  on public.sounds (storage_path);

-- Sunetele fără preview sunt cele de backfilled din panoul de admin.
create index if not exists sounds_missing_preview_idx
  on public.sounds (id) where preview_url is null;

-- ---------------------------------------------------------------------------
-- 2. Bucket-ul de preview-uri
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sound-previews',
  'sound-previews',
  true,
  5 * 1024 * 1024,                       -- 5 MB: un preview nu are ce depăși
  array['audio/mpeg', 'audio/mp3']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Limită și pe bucket-ul principal, ca un upload greșit să nu umple storage-ul.
update storage.buckets
set file_size_limit = 100 * 1024 * 1024  -- 100 MB
where id = 'sounds'
  and (file_size_limit is null or file_size_limit > 100 * 1024 * 1024);

-- ---------------------------------------------------------------------------
-- 3. Policies pe storage.objects
-- ---------------------------------------------------------------------------
-- Ștergem întâi orice policy existentă pe cele două bucket-uri, ca să nu
-- rămână reguli permisive din configurarea anterioară făcută prin dashboard.

-- Cele două policies existente, identificate prin inspecția schemei. Le
-- numim explicit pentru că "Public Read" ar putea fi definită fără referință
-- la bucket (adică pe TOATE bucket-urile), caz în care căutarea după tipar de
-- mai jos nu ar prinde-o și accesul public ar rămâne deschis.
drop policy if exists "Public Read" on storage.objects;
drop policy if exists "Auth Upload" on storage.objects;

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        qual       like '%sound-previews%' or with_check like '%sound-previews%'
        or qual    like '%''sounds''%'     or with_check like '%''sounds''%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- --- sound-previews: citire liberă, scriere doar pentru publisheri ----------
create policy sound_previews_read on storage.objects
  for select
  using (bucket_id = 'sound-previews');

-- Scrierea e limitată la folderul propriu. Fără asta, un publisher putea
-- suprascrie preview-ul altui producător folosind `upsert`.
-- Adminii sunt exceptați: backfill-ul preview-urilor vechi scrie la rădăcina
-- bucket-ului, fiindcă acele fișiere au fost urcate înainte de convenția
-- `<owner_id>/<fișier>`.
create policy sound_previews_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sound-previews'
    and (
      public.is_admin()
      or (
        public.is_publisher()
        and (storage.foldername(name))[1] = auth.uid()::text
      )
    )
  );

create policy sound_previews_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'sound-previews'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy sound_previews_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'sound-previews'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- --- sounds: fără citire din client -----------------------------------------
-- Signed URL-urile se emit în edge function cu service_role, care ocolește
-- RLS. Rolul `authenticated` nu primește deloc SELECT aici, deci nu poate
-- construi singur un URL de descărcare.
--
-- Convenția de cale pentru încărcările noi este `<owner_id>/<fișier>`, ceea ce
-- permite exprimarea proprietății direct în policy. Obiectele vechi sunt la
-- rădăcina bucket-ului, iar pentru ele `foldername(name)[1]` este NULL — deci
-- rămân administrabile doar de admini. Nu le mutăm: mutarea ar invalida
-- `storage_path` din baza de date.
create policy sounds_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sounds'
    and public.is_publisher()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy sounds_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'sounds'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Trigger-gardă pe coloanele privilegiate din `sounds`
-- ---------------------------------------------------------------------------
-- Policy-ul `sounds_update_own` din 20260819120000 permite proprietarului să
-- scrie pe rândurile lui, dar RLS nu distinge între coloane. Fără garda asta,
-- un producător își putea seta `status = 'approved'` și își putea publica
-- singur sunetele, ocolind complet moderarea.
--
-- Definit aici, nu în 20260819120000, pentru că se referă la `storage_path` și
-- `preview_url`, adăugate mai sus în acest fișier.

create or replace function public.guard_sound_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- service_role / SQL editor / migrări trec.
  if nullif(current_setting('request.jwt.claims', true), '') is null
     or coalesce(
          nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
          ''
        ) = 'service_role'
  then
    return new;
  end if;

  -- Adminii moderează: pot schimba statusul și pot completa preview-urile.
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

drop trigger if exists guard_sound_privileged_columns on public.sounds;
create trigger guard_sound_privileged_columns
  before update on public.sounds
  for each row execute function public.guard_sound_privileged_columns();

-- ---------------------------------------------------------------------------
-- 4. Rezolvarea căii pentru descărcare
-- ---------------------------------------------------------------------------
-- Edge function-ul primește doar `sound_id` de la client. Calea reală în
-- storage o aflăm aici, ca utilizatorul să nu poată cere semnarea unui obiect
-- arbitrar din bucket.

create or replace function public.get_sound_storage_path(p_sound_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select s.storage_path
  from public.sounds s
  where s.id = p_sound_id
    and s.status = 'approved';
$$;

revoke all on function public.get_sound_storage_path(uuid) from public;
revoke execute on function public.get_sound_storage_path(uuid) from anon, authenticated;
grant execute on function public.get_sound_storage_path(uuid) to service_role;
