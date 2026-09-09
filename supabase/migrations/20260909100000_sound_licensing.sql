-- ============================================================================
-- Beats.ly — Licența unui sunet
-- ============================================================================
-- Nu exista niciun câmp care să spună cum are voie cineva să folosească un
-- sunet descărcat. Un simplu tag informativ — nu impunem nimic tehnic, doar
-- afișăm intenția producătorului.
-- ============================================================================

alter table public.sounds
  add column if not exists license text not null default 'royalty_free';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sounds_license_check'
  ) then
    alter table public.sounds
      add constraint sounds_license_check
      check (license in ('royalty_free', 'attribution_required', 'exclusive'));
  end if;
end $$;

comment on column public.sounds.license is
  'royalty_free: folosire liberă. attribution_required: trebuie menționat autorul. exclusive: doar cu acordul direct al autorului. Editabil de proprietar, ca title/tags — nu e o coloană privilegiată.';
