-- ============================================================================
-- Beats.ly — Returnarea creditului la eșec de generare
-- ============================================================================
-- Funcția `generate-audio` consumă creditul înainte de a chema HuggingFace,
-- ca userul să nu poată genera fără să plătească. Dacă providerul cade sau
-- returnează eroare, creditul trebuie dat înapoi.
--
-- Separată de `grant_purchased_credits` pentru că aceea inserează o
-- notificare "Credits Added", care ar fi derutantă pentru un refund.
-- ============================================================================

create or replace function public.refund_credit(
  p_user_id uuid,
  p_reason  text default 'generation_failed'
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_tier    text;
  v_role    text;
  v_credits integer;
begin
  select tier, role into v_tier, v_role
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profil inexistent: %', p_user_id using errcode = 'P0002';
  end if;

  -- Conturile nelimitate nu au consumat nimic, deci nu au ce primi înapoi.
  if v_tier = 'ultimate' or v_role = 'OWNER' then
    return -1;
  end if;

  perform set_config('app.privileged_write', 'on', true);

  update public.profiles
  set credits = credits + 1
  where id = p_user_id
  returning credits into v_credits;

  perform set_config('app.privileged_write', 'off', true);

  raise log 'Refunded 1 credit to % (reason: %)', p_user_id, p_reason;

  return v_credits;
end;
$$;

revoke all on function public.refund_credit(uuid, text) from public;
revoke execute on function public.refund_credit(uuid, text) from anon, authenticated;
grant execute on function public.refund_credit(uuid, text) to service_role;
