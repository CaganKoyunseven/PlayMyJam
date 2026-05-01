-- ============================================================
-- PlayMyJam — Admin patches
-- Run in Supabase SQL Editor after migration.sql
-- ============================================================

-- Add session_id column for anonymous request tracking
alter table public.song_requests
  add column if not exists session_id text;

-- Allow updating song_requests status (approve/reject)
drop policy if exists "song_requests_anon_update" on public.song_requests;
create policy "song_requests_anon_update" on public.song_requests
  for update using (true) with check (true);

-- Allow songs upsert (needed for playlist import)
drop policy if exists "songs_anon_insert" on public.songs;
create policy "songs_anon_insert" on public.songs
  for insert with check (true);

drop policy if exists "songs_anon_update" on public.songs;
create policy "songs_anon_update" on public.songs
  for update using (true);
