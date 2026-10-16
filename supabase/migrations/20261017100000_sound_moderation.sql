-- ============================================================================
-- Beats.ly — Moderarea sunetelor
-- ============================================================================
-- 1. `approve_sounds(ids)`: aprobă mai multe sunete dintr-o dată, verificat pe
--    server (doar admini), și întoarce câte au fost aprobate efectiv.
-- 2. Notificarea către urmăritori nu mai poate bloca aprobarea: dacă
--    inserarea în `notifications` eșuează, aprobarea merge mai departe.
--    Înainte, orice eroare din trigger anula tot UPDATE-ul și butonul
--    „Aprobă” din Admin părea că nu face nimic.
-- 3. Adminii pot citi obiectele din bucket-ul privat `sounds` (URL-uri
--    semnate) — pentru ascultarea sunetelor în așteptare și pentru generarea
--    preview-urilor lipsă.
--
-- Idempotentă: se poate rula de mai multe ori.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Aprobare în grup
-- ---------------------------------------------------------------------------
create or replace function public.approve_sounds(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Doar administratorii pot aproba sunete.'
      using errcode = '42501';
  end if;

  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;

  update public.sounds
  set status = 'approved'
  where id = any(p_ids)
    and status is distinct from 'approved';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.approve_sounds(uuid[]) from public;
grant execute on function public.approve_sounds(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Notificarea urmăritorilor — fără să blocheze aprobarea
-- ---------------------------------------------------------------------------
create or replace function public.notify_followers_on_sound_approved()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  begin
    insert into public.notifications (user_id, title, message, type)
    select
      f.follower_id,
      'New sound from someone you follow',
      format('%s just published "%s".', coalesce(p.username, 'A producer you follow'), new.title),
      'follow'
    from public.follows f
    join public.profiles p on p.id = new.owner_id
    where f.followed_id = new.owner_id;
  exception when others then
    -- O notificare pierdută e mai bună decât un sunet care nu se mai poate aproba.
    raise warning 'notify_followers_on_sound_approved: %', sqlerrm;
  end;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Adminii pot genera URL-uri semnate pentru fișierele originale
-- ---------------------------------------------------------------------------
drop policy if exists sounds_object_select_admin on storage.objects;
create policy sounds_object_select_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'sounds'
    and public.is_admin()
  );
