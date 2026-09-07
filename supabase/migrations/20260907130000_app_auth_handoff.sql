-- ============================================================================
-- Beats.ly — App auth handoff: login pe site, sesiunea ajunge în aplicație
-- ============================================================================
-- Aplicația desktop nu mai are formular propriu de login — deschide site-ul
-- într-un browser real (unde e și hCaptcha-ul), userul se autentifică acolo,
-- iar sesiunea "sare" înapoi în aplicație printr-un cod temporar:
--
--   1. Aplicația generează un cod random (256 biți, imposibil de ghicit) și
--      deschide https://.../app-login?code=<cod> în browser.
--   2. Userul se loghează pe site. Odată ce are sesiune, site-ul trimite
--      access_token + refresh_token către edge function-ul `submit-auth-code`,
--      însoțite de cod.
--   3. Aplicația face polling pe `exchange-auth-code` cu același cod, până
--      primește tokenii — pe care îi consumă o singură dată (rândul se șterge
--      imediat după citire) și expiră singur în 5 minute dacă nu e revendicat.
--
-- Tokenii de sesiune stau aici doar tranzitoriu. Tabela n-are NICIO politică
-- RLS pentru authenticated/anon — orice acces trece exclusiv prin edge
-- functions, cu service_role (care ocolește RLS oricum, dar RLS fără nicio
-- policy blochează total accesul direct din client, din PostgREST).
-- ============================================================================

create table if not exists public.app_auth_handoff (
  code          text        primary key,
  access_token  text        not null,
  refresh_token text        not null,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '5 minutes')
);

alter table public.app_auth_handoff enable row level security;

comment on table public.app_auth_handoff is
  'Cod temporar (max 5 minute, o singură citire) pentru a transfera o sesiune de pe site în aplicația desktop. Fără politici RLS — acces doar prin service_role, din edge functions.';
