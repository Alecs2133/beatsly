-- ============================================================================
-- Beats.ly — Trecerea bucket-ului `sounds` la privat
-- ============================================================================
--
--  ⚠  DE APLICAT ULTIMA, ȘI DOAR DUPĂ CE:
--
--   1. Migrarea 20260819120300_sound_previews.sql a fost aplicată.
--   2. Toate sunetele au `preview_url` completat (butonul "Generate missing
--      previews" din panoul de admin, tab-ul Sound Moderation).
--      Verificare:  select count(*) from public.sounds
--                   where status = 'approved' and preview_url is null;
--      Trebuie să întoarcă 0.
--   3. Edge function-ul `get-download-url` este deployat.
--   4. Build-ul nou al aplicației a fost livrat utilizatorilor.
--
--  Aplicată mai devreme, oprește redarea și descărcarea în clienții vechi,
--  care încă folosesc URL-urile publice din `file_url`.
--
--  Rollback:  update storage.buckets set public = true where id = 'sounds';
-- ============================================================================

-- Verificarea acoperă TOATE sunetele cu fișier în storage, nu doar cele
-- aprobate. Un sunet în moderare tot trebuie ascultat — de proprietarul lui și
-- de moderator — iar după ce bucket-ul devine privat singura sursă de redare
-- este `preview_url`. O verificare limitată la `status = 'approved'` ar trece
-- fără să se plângă într-o bază unde nimic nu e încă aprobat, exact cazul în
-- care ar face cel mai mult rău.
do $$
declare
  v_missing integer;
  v_detail  text;
begin
  select count(*) into v_missing
  from public.sounds
  where storage_path is not null
    and preview_url is null;

  if v_missing > 0 then
    select string_agg(status || ': ' || n::text, ', ' order by status)
    into v_detail
    from (
      select coalesce(status, '(null)') as status, count(*) as n
      from public.sounds
      where storage_path is not null and preview_url is null
      group by coalesce(status, '(null)')
    ) d;

    raise exception
      'Nu pot trece bucket-ul la privat: % sunete nu au preview_url (%). Ruleaza intai backfill-ul din panoul de admin.',
      v_missing, v_detail
      using errcode = 'P0001';
  end if;

  select count(*) into v_missing
  from public.sounds
  where storage_path is null;

  if v_missing > 0 then
    raise exception
      'Nu pot trece bucket-ul la privat: % sunete nu au storage_path, deci nu pot fi descarcate prin URL semnat.',
      v_missing
      using errcode = 'P0001';
  end if;
end $$;

update storage.buckets
set public = false
where id = 'sounds';
