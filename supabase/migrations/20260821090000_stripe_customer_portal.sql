-- ============================================================================
-- Beats.ly — Stripe Customer Portal ("Manage Subscription")
-- ============================================================================
-- Nu exista nicaieri o legatura stocata intre un user Supabase si clientul lui
-- Stripe. Fara ea, nu putem deschide Customer Portal-ul pentru cineva —
-- API-ul Stripe cere un customer id, nu un email.
--
-- Aceasta migrare:
--   1. Adauga profiles.stripe_customer_id, populat de webhook la finalizarea
--      unui checkout de abonament (nu si la creditele one-time — acelea nu
--      creeaza garantat un Customer persistent in Stripe).
--   2. Extinde garda de coloane privilegiate de pe profiles, ca userul sa nu
--      poata scrie singur acest id (si-ar putea atasa contul la orice
--      customer Stripe altul, daca ar ghici/afla un id).
--   3. Extinde apply_subscription_tier() sa scrie tier + customer_id atomic,
--      intr-un singur update, nu in doua apeluri separate din webhook.
-- ============================================================================

alter table public.profiles
  add column if not exists stripe_customer_id text;

comment on column public.profiles.stripe_customer_id is
  'Customer id-ul Stripe asociat, setat de stripe-webhook la primul abonament finalizat. NULL daca userul nu a avut niciodata un abonament.';

-- Un customer Stripe apartine unui singur user. Index partial, ca sa
-- permitem oricate randuri cu NULL (userii care n-au cumparat inca).
create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- ---------------------------------------------------------------------------
-- Extindem garda de coloane privilegiate
-- ---------------------------------------------------------------------------
-- Redefinim functia existenta din 20260819120000 ca sa acopere si noua
-- coloana. Restul corpului e neschimbat.

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  privileged boolean;
begin
  if nullif(current_setting('request.jwt.claims', true), '') is null
     or coalesce(
          nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
          ''
        ) = 'service_role'
  then
    return new;
  end if;

  privileged := coalesce(current_setting('app.privileged_write', true), 'off') = 'on';
  if privileged then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Coloana "role" nu poate fi modificată din client.'
      using errcode = '42501';
  end if;

  if new.tier is distinct from old.tier then
    raise exception 'Coloana "tier" nu poate fi modificată din client.'
      using errcode = '42501';
  end if;

  if new.credits is distinct from old.credits then
    raise exception 'Coloana "credits" nu poate fi modificată din client. Folosește deduct_credit().'
      using errcode = '42501';
  end if;

  if new.last_refill_date is distinct from old.last_refill_date then
    raise exception 'Coloana "last_refill_date" nu poate fi modificată din client.'
      using errcode = '42501';
  end if;

  if new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception 'Coloana "stripe_customer_id" nu poate fi modificată din client.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'Coloana "id" nu poate fi modificată.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- apply_subscription_tier: acum scrie si customer_id, atomic cu tier-ul
-- ---------------------------------------------------------------------------
-- ATENTIE: `create or replace function` NU inlocuieste o functie a carei
-- lista de parametri difera ca tipuri/numar — Postgres identifica functiile
-- dupa (nume, tipuri de parametri), deci un parametru nou adaugat ar crea un
-- AL DOILEA overload separat, lasand versiunea veche (3 argumente) intacta
-- si apelabila in continuare. Stergem explicit vechea semnatura intai.

drop function if exists public.apply_subscription_tier(text, uuid, text);

create or replace function public.apply_subscription_tier(
  p_event_id     text,
  p_user_id      uuid,
  p_tier         text,
  p_customer_id  text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_tier text := lower(trim(p_tier));
begin
  if v_tier not in ('free', 'producer', 'ultimate') then
    raise exception 'Tier invalid: %', p_tier using errcode = '22023';
  end if;

  insert into public.processed_stripe_events (event_id, event_type, user_id)
  values (p_event_id, 'subscription', p_user_id)
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  perform set_config('app.privileged_write', 'on', true);

  update public.profiles
  set tier = v_tier,
      -- coalesce: dacă webhook-ul nu trimite customer_id (n-ar trebui să se
      -- întâmple, dar nu vrem să ștergem un id existent dacă totuși se
      -- întâmplă), păstrăm ce era deja stocat.
      stripe_customer_id = coalesce(p_customer_id, stripe_customer_id)
  where id = p_user_id;

  perform set_config('app.privileged_write', 'off', true);

  insert into public.notifications (user_id, title, message, type)
  values (
    p_user_id,
    'Subscription Upgraded',
    format('Your account has been upgraded to the %s tier. Welcome!', v_tier),
    'system'
  );

  return true;
end;
$$;

-- Fiind un obiect nou in catalog (dupa drop+create), nu are niciun grant
-- implicit — dar emitem explicit, ca sa nu depindem tacit de asta.
revoke all on function public.apply_subscription_tier(text, uuid, text, text) from public;
revoke execute on function public.apply_subscription_tier(text, uuid, text, text) from anon, authenticated;
grant execute on function public.apply_subscription_tier(text, uuid, text, text) to service_role;
