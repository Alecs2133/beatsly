-- ============================================================================
-- Beats.ly — Notificări prin Realtime
-- ============================================================================
-- TopBar făcea polling la 30s pe `notifications`. Realtime trimite un
-- eveniment doar pentru tabelele din publicația `supabase_realtime` — fără
-- linia asta, abonamentul din client se conectează fără erori, dar nu
-- primește niciodată nimic.
--
-- RLS se aplică și pe Realtime: `notifications_select_own` face ca fiecare
-- user să primească doar propriile rânduri.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
