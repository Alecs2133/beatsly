-- ============================================================================
-- Audit DUPĂ migrare — O SINGURĂ interogare, un singur rezultat
-- ============================================================================
-- Read-only. Selectează tot fișierul și rulează-l în SQL Editor.
-- Rezultatul e o coloană de text; copiaz-o integral.
--
-- Fiecare linie care începe cu [!] semnalează ceva de verificat.
-- ============================================================================

with
-- --- 1. S-au aplicat migrările? --------------------------------------------
checks as (
  select 1 as ord, 'profiles.role'          as item,
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='profiles'
                   and column_name='role') as ok
  union all select 2, 'sounds.owner_id',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='sounds'
                   and column_name='owner_id')
  union all select 3, 'sounds.preview_url',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='sounds'
                   and column_name='preview_url')
  union all select 4, 'tabela user_libraries',
         to_regclass('public.user_libraries') is not null
  union all select 5, 'tabela processed_stripe_events',
         to_regclass('public.processed_stripe_events') is not null
  union all select 6, 'is_admin()',
         to_regprocedure('public.is_admin()') is not null
  union all select 7, 'is_publisher()',
         to_regprocedure('public.is_publisher()') is not null
  union all select 8, 'deduct_credit()',
         to_regprocedure('public.deduct_credit()') is not null
  union all select 9, 'claim_daily_refill()',
         to_regprocedure('public.claim_daily_refill()') is not null
  union all select 10, 'refund_credit()',
         to_regprocedure('public.refund_credit(uuid, text)') is not null
  union all select 11, 'get_sound_storage_path()',
         to_regprocedure('public.get_sound_storage_path(uuid)') is not null
  union all select 12, 'functia moarta approve_producer_request a DISPARUT',
         to_regprocedure('public.approve_producer_request(uuid, uuid)') is null
  union all select 13, 'trigger guard pe profiles',
         exists (select 1 from pg_trigger
                 where tgname='guard_profile_privileged_columns' and not tgisinternal)
  union all select 14, 'trigger guard pe sounds',
         exists (select 1 from pg_trigger
                 where tgname='guard_sound_privileged_columns' and not tgisinternal)
  union all select 15, 'trigger on_auth_user_created',
         exists (select 1 from pg_trigger
                 where tgname='on_auth_user_created' and not tgisinternal)
  union all select 16, 'index unic pe username',
         exists (select 1 from pg_indexes
                 where schemaname='public' and indexname='profiles_username_unique_idx')
  union all select 17, 'bucket sound-previews',
         exists (select 1 from storage.buckets where id='sound-previews')
),
-- --- 2. Coloane scriptibile de authenticated pe profiles --------------------
writable as (
  select string_agg(column_name, ', ' order by column_name) as cols
  from information_schema.column_privileges
  where table_schema='public' and table_name='profiles'
    and grantee='authenticated' and privilege_type='UPDATE'
),
-- --- 3. Funcții privilegiate apelabile de authenticated? --------------------
privfns as (
  select string_agg(p.proname, ', ' order by p.proname) as leaked
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('grant_purchased_credits','apply_subscription_tier',
                      'refund_credit','get_sound_storage_path')
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
),
-- --- 4. Roluri privilegiate -------------------------------------------------
roles as (
  select p.role || ' : ' || coalesce(u.email,'(fara email)') as line
  from public.profiles p join auth.users u on u.id=p.id
  where p.role <> 'USER'
),
-- --- 5. Proprietate ---------------------------------------------------------
owners as (
  select
    count(*) filter (where owner_id is null)  as orphans,
    count(*)                                   as total
  from public.sounds
),
dupes as (
  select count(*) as n from (
    select 1 from public.profiles
    where username is not null and trim(username) <> ''
    group by lower(trim(username)) having count(*) > 1
  ) d
),
-- --- 6. Preview-uri ---------------------------------------------------------
previews as (
  select
    count(*) filter (where status='approved' and preview_url is null) as missing,
    count(*) filter (where storage_path is null)                       as nopath
  from public.sounds
),
-- --- 7. Policies ------------------------------------------------------------
pol as (
  select tablename || ' [' || cmd || '] ' || policyname as line
  from pg_policies where schemaname in ('public','storage')
),
bkt as (
  select id || '  public=' || public::text as line from storage.buckets
)
select line from (
            select 1 as s, '===== MIGRARI APLICATE ====='::text as line
  union all select 2, case when ok then '  ok   ' else '  [!]  ' end || item from checks
  union all select 3, '===== COLOANE SCRIPTIBILE PE PROFILES (trebuie exact 4) ====='
  union all select 4, '  ' || coalesce((select cols from writable), '(niciuna)') from writable
  union all select 5, '===== FUNCTII PRIVILEGIATE EXPUSE LUI authenticated ====='
  union all select 6, case when (select leaked from privfns) is null
                           then '  ok   niciuna expusa'
                           else '  [!]  EXPUSE: ' || (select leaked from privfns) end
  union all select 7, '===== ROLURI PRIVILEGIATE ====='
  union all select 8, '  ' || line from roles
  union all select 9, '===== PROPRIETATE SUNETE ====='
  union all select 10,
      case when (select orphans from owners) = 0 then '  ok   ' else '  [!]  ' end
      || (select orphans from owners)::text || ' din ' || (select total from owners)::text
      || ' sunete fara owner_id'
  union all select 11,
      case when (select n from dupes) = 0 then '  ok   ' else '  [!]  ' end
      || (select n from dupes)::text || ' username-uri duplicate'
  union all select 12, '===== PREVIEW-URI (pentru pasul 6) ====='
  union all select 13,
      case when (select missing from previews) = 0 then '  ok   ' else '  [!]  ' end
      || (select missing from previews)::text || ' aprobate fara preview, '
      || (select nopath from previews)::text || ' fara storage_path'
  union all select 14, '===== POLICIES ====='
  union all select 15, '  ' || line from pol
  union all select 16, '===== BUCKETS ====='
  union all select 17, '  ' || line from bkt
) z
order by s, line;
