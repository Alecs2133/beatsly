-- ============================================================================
-- Beats.ly — Colecții personale (playlist-uri)
-- ============================================================================
-- "My Sounds" e o singură listă plată (user_libraries) — util pentru puține
-- sunete, greu de navigat pentru sute. Colecțiile sunt grupuri denumite,
-- strict private, independente de user_libraries: un sunet poate fi
-- într-o colecție fără să fie neapărat "salvat", și invers.
-- ============================================================================

create table if not exists public.collections (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references auth.users (id) on delete cascade,
  name       text        not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create index if not exists collections_owner_id_idx on public.collections (owner_id);

create table if not exists public.collection_sounds (
  collection_id uuid        not null references public.collections (id) on delete cascade,
  sound_id      uuid        not null references public.sounds (id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (collection_id, sound_id)
);

alter table public.collections       enable row level security;
alter table public.collection_sounds enable row level security;

-- Strict privat — spre deosebire de crews, nu există niciun concept de
-- membru sau partajare. Owner-ul e singurul care poate face orice.
create policy collections_all_own on public.collections
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy collection_sounds_all_own on public.collection_sounds
  for all to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = auth.uid()
    )
  );
