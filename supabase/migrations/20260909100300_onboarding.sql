-- ============================================================================
-- Beats.ly — Onboarding pentru useri noi
-- ============================================================================
-- `null` = încă nu a văzut turul de bun venit. Setat o singură dată, la
-- final. Nu e o coloană sensibilă (nimic de securitate depinde de ea), dar
-- `profiles` are un allowlist explicit de coloane scriptibile din client
-- (vezi migrarea de securitate) — fără GRANT explicit, update-ul ar eșua
-- tăcut cu o eroare de privilegii, nu de RLS.
-- ============================================================================

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

grant update (onboarded_at) on public.profiles to authenticated;
