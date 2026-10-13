-- ============================================================================
-- Beats.ly — Sfârșitul unui abonament
-- ============================================================================
-- Webhook-ul Stripe trata doar `checkout.session.completed`, deci tier-ul se
-- putea doar mări: un abonament anulat sau cu plata eșuată lăsa contul pe
-- Producer / Ultimate pentru totdeauna. Funcția de mai jos îl readuce pe
-- 'free' când Stripe anunță că abonamentul s-a încheiat
-- (`customer.subscription.deleted`).
--
-- Identificăm userul după `stripe_customer_id` (salvat la checkout de
-- apply_subscription_tier), pentru că evenimentele de abonament nu au
-- `client_reference_id`. Idempotentă pe `event_id`, ca și celelalte.
-- ============================================================================

create or replace function public.end_subscription_by_customer(
  p_event_id    text,
  p_customer_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.profiles
  where stripe_customer_id = p_customer_id;

  if v_user_id is null then
    -- Client Stripe necunoscut (ex. creat manual din dashboard). Nimic de făcut.
    return false;
  end if;

  insert into public.processed_stripe_events (event_id, event_type, user_id)
  values (p_event_id, 'subscription_end', v_user_id)
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  perform set_config('app.privileged_write', 'on', true);

  -- Creditele cumpărate separat rămân; refill-ul zilnic le completează de
  -- acum după regula planului gratuit.
  update public.profiles
  set tier = 'free'
  where id = v_user_id;

  perform set_config('app.privileged_write', 'off', true);

  insert into public.notifications (user_id, title, message, type)
  values (
    v_user_id,
    'Subscription Ended',
    'Your subscription has ended and your account is now on the Free plan. You can subscribe again at any time from the Store.',
    'system'
  );

  return true;
end;
$$;

revoke all on function public.end_subscription_by_customer(text, text) from public;
revoke execute on function public.end_subscription_by_customer(text, text) from anon, authenticated;
grant execute on function public.end_subscription_by_customer(text, text) to service_role;
