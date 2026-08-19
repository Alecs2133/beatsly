-- ============================================================================
-- Audit ÎNAINTE de migrare
-- ============================================================================
-- Se poate rula integral, dintr-o singură bucată. Nu modifică nimic.
-- Toate interogările funcționează pe schema actuală, dinaintea migrărilor.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Cine are rol privilegiat în acest moment?
-- ---------------------------------------------------------------------------
-- ACEASTA E VERIFICAREA IMPORTANTĂ.
--
-- Rolul se citea din `user_metadata`, pe care orice utilizator autentificat
-- și-l putea seta singur, rulând în consolă:
--     supabase.auth.updateUser({ data: { role: 'OWNER' } })
--
-- Parcurge lista de mai jos manual. Dacă apare cineva pe care nu l-ai promovat
-- tu, rolul a fost auto-atribuit. Șterge-l ÎNAINTE de migrare — backfill-ul
-- păstrează rolurile existente și l-ar transforma într-un rol legitim.
--
-- Ștergerea unui rol auto-atribuit (înlocuiește adresa):
--     update auth.users
--     set raw_user_meta_data = raw_user_meta_data - 'role'
--     where email = 'adresa@exemplu.com';

select
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'role'  as rol_din_user_metadata,
  u.created_at,
  u.last_sign_in_at
from auth.users u
where coalesce(u.raw_user_meta_data ->> 'role', '') <> ''
order by u.created_at;


-- ---------------------------------------------------------------------------
-- 2. Conturi cu credite sau tier suspecte
-- ---------------------------------------------------------------------------
-- `profiles` permitea update pe tot rândul, deci utilizatorul putea scrie
-- direct `credits` sau `tier`. Cel mai mare pachet cumpărabil e de 300 credite.

select
  u.email,
  p.tier,
  p.credits,
  u.raw_user_meta_data ->> 'role' as rol,
  p.last_refill_date
from public.profiles p
join auth.users u on u.id = p.id
where p.credits > 300
   or p.tier <> 'free'
order by p.credits desc;


-- ---------------------------------------------------------------------------
-- 3. Fotografie a policies-urilor actuale
-- ---------------------------------------------------------------------------
-- Salvează rezultatul. Migrarea le șterge pe toate și le recreează, iar asta
-- e singura urmă a configurației dinainte.

select
  tablename,
  policyname,
  cmd,
  roles::text,
  qual        as using_expr,
  with_check  as check_expr
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;


-- ---------------------------------------------------------------------------
-- 4. RLS e pornit pe toate tabelele?
-- ---------------------------------------------------------------------------

select
  c.relname        as tabela,
  c.relrowsecurity as rls_activ
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;


-- ---------------------------------------------------------------------------
-- 5. Ce coloane poate scrie `authenticated` pe profiles, acum
-- ---------------------------------------------------------------------------
-- Dacă rezultatul e gol, permisiunile vin de la nivel de tabel, nu de coloană
-- — adică userul poate scrie orice coloană. Exact asta repară migrarea.

select
  column_name,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'profiles'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
order by column_name;


-- ---------------------------------------------------------------------------
-- 6. Bucket-urile de storage
-- ---------------------------------------------------------------------------
-- `sounds` trebuie să fie încă public în acest moment. Devine privat abia la
-- ultima migrare, după generarea preview-urilor.

select id, name, public, file_size_limit
from storage.buckets
order by id;
