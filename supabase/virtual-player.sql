-- ============================================================
-- PlayMyJam — Virtual Player patch
-- Adds started_at timestamp so clients can compute the current
-- playback position from `now() - started_at`, independent of
-- the Spotify Web Playback SDK.
-- Run in Supabase SQL Editor after migration.sql.
-- ============================================================

alter table public.queue_items
  add column if not exists started_at timestamptz;
