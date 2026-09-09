-- ============================================================================
-- Beats.ly — Raportare de erori din client
-- ============================================================================
-- Până acum, o eroare la un user real (decodare audio, drag-and-drop nativ,
-- fluxul de auth prin browser) ajungea doar în consola LUI — echipa n-avea
-- cum să afle. Tabela asta e o cutie poștală simplă: clientul scrie, doar
-- adminii citesc.
--
-- Scop deliberat restrâns: fără rate-limiting la nivel de DB (RLS n-are cum
-- să numere cereri), fără agregare/deduplicare. Un abuz aici umple tabela cu
-- rânduri inutile, nu compromite date — proporțional cu riscul real.
-- ============================================================================

create table if not exists public.client_error_reports (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users (id) on delete set null,
  platform    text        not null check (platform in ('desktop', 'website')),
  context     text        not null check (char_length(context) <= 200),
  message     text        not null check (char_length(message) <= 2000),
  stack       text        check (stack is null or char_length(stack) <= 8000),
  app_version text        check (app_version is null or char_length(app_version) <= 40),
  created_at  timestamptz not null default now()
);

create index if not exists client_error_reports_created_at_idx
  on public.client_error_reports (created_at desc);

alter table public.client_error_reports enable row level security;

-- Oricine poate raporta o eroare — inclusiv un vizitator nelogat pe site sau
-- aplicația înainte de finalizarea handoff-ului de autentificare. `user_id`
-- e opțional exact din acest motiv.
create policy client_error_reports_insert_any on public.client_error_reports
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- Doar adminii citesc — sunt potențial mesaje de eroare brute, nu date de
-- afișat vreunui user obișnuit.
create policy client_error_reports_select_admin on public.client_error_reports
  for select to authenticated
  using (public.is_admin());

revoke update, delete on public.client_error_reports from anon, authenticated;
