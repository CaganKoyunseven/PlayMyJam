-- ============================================================
-- PlayMyJam — Events Table (Event-Driven Architecture)
-- Run in Supabase SQL Editor after migration.sql
-- ============================================================

-- ── Event types ───────────────────────────────────────────────
-- SONG_REQUESTED     → customer sent a song request
-- SONG_APPROVED      → admin approved the request
-- SONG_REJECTED      → admin rejected the request
-- SONG_ADDED_TO_QUEUE → song inserted into queue_items
-- SONG_STARTED       → playback started for a song
-- SONG_FINISHED      → song finished playing
-- TOKEN_SPENT        → customer spent a token
-- TOKEN_PURCHASED    → customer purchased tokens
-- QUEUE_REORDERED    → queue position changed

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  venue_id    uuid references public.venues(id) on delete cascade,
  payload     jsonb not null default '{}',
  created_at  timestamptz default now()
);

create index if not exists events_type_idx      on public.events(type);
create index if not exists events_venue_id_idx  on public.events(venue_id);
create index if not exists events_created_at_idx on public.events(created_at desc);

-- RLS: public read, anon insert (tighten when auth wired)
alter table public.events enable row level security;

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events for select using (true);

drop policy if exists "events_anon_insert" on public.events;
create policy "events_anon_insert" on public.events for insert with check (true);

-- Realtime: enable in Supabase Dashboard
-- Database → Replication → Tables → enable "events"
