-- ============================================================================
-- Beats.ly — Acordare de credite/abonament, atomică și idempotentă
-- ============================================================================
-- Rezolvă în webhook-ul Stripe:
--   1. Race condition: `select credits` urmat de `update credits = X + N`.
--      Două evenimente procesate simultan pierdeau unul din incremente.
--   2. Lipsa idempotenței: Stripe reîncearcă webhook-urile la timeout sau
--      răspuns non-2xx. Fiecare reîncercare acorda creditele din nou.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Registru de evenimente Stripe deja procesate
-- ---------------------------------------------------------------------------

create table if not exists public.processed_stripe_events (
  event_id     text primary key,
  event_type   text        not null,
  user_id      uuid        references auth.users (id) on delete set null,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;
-- Fără policies: accesibil exclusiv prin service_role (webhook-ul).

-- ---------------------------------------------------------------------------
-- 2. Acordare de credite — atomică, idempotentă
-- ---------------------------------------------------------------------------
-- Returnează `true` dacă evenimentul a fost aplicat acum, `false` dacă fusese
-- deja procesat (reîncercare Stripe).

create or replace function public.grant_purchased_credits(
  p_event_id text,
  p_user_id  uuid,
  p_amount   integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Cantitate invalidă de credite: %', p_amount
      using errcode = '22023';
  end if;

  -- Inserția pe cheia primară e bariera de idempotență: a doua livrare a
  -- aceluiași event_id nu inserează nimic și iese fără să acorde credite.
  insert into public.processed_stripe_events (event_id, event_type, user_id)
  values (p_event_id, 'credits', p_user_id)
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  perform set_config('app.privileged_write', 'on', true);

  -- Increment atomic: citirea și scrierea sunt în aceeași instrucțiune.
  update public.profiles
  set credits = credits + p_amount
  where id = p_user_id;

  perform set_config('app.privileged_write', 'off', true);

  insert into public.notifications (user_id, title, message, type)
  values (
    p_user_id,
    'Credits Added',
    format('Successfully added %s credits to your account.', p_amount),
    'credits'
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Aplicare abonament — idempotentă
-- ---------------------------------------------------------------------------

create or replace function public.apply_subscription_tier(
  p_event_id text,
  p_user_id  uuid,
  p_tier     text
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
  set tier = v_tier
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

-- ---------------------------------------------------------------------------
-- 4. Privilegii: doar webhook-ul (service_role) poate acorda bunuri plătite
-- ---------------------------------------------------------------------------

revoke all on function public.grant_purchased_credits(text, uuid, integer) from public;
revoke all on function public.apply_subscription_tier(text, uuid, text)     from public;

revoke execute on function public.grant_purchased_credits(text, uuid, integer) from anon, authenticated;
revoke execute on function public.apply_subscription_tier(text, uuid, text)     from anon, authenticated;

grant execute on function public.grant_purchased_credits(text, uuid, integer) to service_role;
grant execute on function public.apply_subscription_tier(text, uuid, text)     to service_role;
