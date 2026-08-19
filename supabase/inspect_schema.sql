-- ============================================================================
-- Inspecția schemei — O SINGURĂ interogare, un singur rezultat
-- ============================================================================
-- Read-only. Selectează tot fișierul și rulează-l.
-- Rezultatul e o singură coloană de text: copiaz-o integral și trimite-o.
-- ============================================================================

with cols as (
  select
    c.relname as t,
    string_agg(
      a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
        || case when a.attnotnull then ' NOT NULL' else '' end,
      ', ' order by a.attnum
    ) as def
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname
),
cons as (
  select
    c.conrelid::regclass::text as t,
    case c.contype when 'p' then 'PK' when 'u' then 'UNIQUE' when 'f' then 'FK' end as kind,
    pg_get_constraintdef(c.oid) as def
  from pg_constraint c
  join pg_namespace n on n.oid = c.connamespace
  where n.nspname = 'public' and c.contype in ('p', 'u', 'f')
),
fns as (
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
pol as (
  select tablename || ' [' || cmd || '] ' || policyname as def
  from pg_policies
  where schemaname in ('public', 'storage')
),
bkt as (
  select id || '  public=' || public::text as def
  from storage.buckets
)
select line from (
            select 1 as s, '===== TABELE SI COLOANE ====='::text          as line
  union all select 2,      t || '  ->  ' || def                            from cols
  union all select 3,      '===== CONSTRANGERI (PK / UNIQUE / FK) ====='
  union all select 4,      t || '  [' || kind || ']  ' || def              from cons
  union all select 5,      '===== FUNCTII ====='
  union all select 6,      def                                             from fns
  union all select 7,      '===== POLICIES ====='
  union all select 8,      def                                             from pol
  union all select 9,      '===== BUCKETS ====='
  union all select 10,     def                                             from bkt
  union all select 11,     '===== STARE MIGRARE (toate trebuie false daca s-a facut rollback) ====='
  union all select 12,     'profiles.role exista: ' || (exists (
                             select 1 from information_schema.columns
                             where table_schema = 'public'
                               and table_name = 'profiles'
                               and column_name = 'role'
                           ))::text
  union all select 13,     'is_admin() exista: '
                           || (to_regprocedure('public.is_admin()') is not null)::text
  union all select 14,     'deduct_credit() exista: '
                           || (to_regprocedure('public.deduct_credit()') is not null)::text
) z
order by s, line;
