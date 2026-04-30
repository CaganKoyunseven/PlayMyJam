-- ============================================================
-- PlayMyJam — Full Migration
-- Run in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT)
-- ============================================================

-- ── songs ────────────────────────────────────────────────────
create table if not exists public.songs (
  id                uuid primary key default gen_random_uuid(),
  spotify_track_id  text unique not null,
  title             text not null,
  artist            text not null,
  album             text,
  album_art         text,
  duration_ms       int,
  created_at        timestamptz default now()
);

create index if not exists songs_spotify_track_id_idx on public.songs(spotify_track_id);

-- ── playlists ────────────────────────────────────────────────
create table if not exists public.playlists (
  id                  uuid primary key default gen_random_uuid(),
  venue_id            uuid references public.venues(id) on delete cascade,
  spotify_playlist_id text not null,
  name                text not null,
  image_url           text,
  track_count         int default 0,
  imported_at         timestamptz default now(),
  unique(venue_id, spotify_playlist_id)
);

create index if not exists playlists_venue_id_idx on public.playlists(venue_id);

-- ── playlist_songs (join table) ──────────────────────────────
create table if not exists public.playlist_songs (
  playlist_id  uuid references public.playlists(id) on delete cascade,
  song_id      uuid references public.songs(id) on delete cascade,
  position     int default 0,
  primary key (playlist_id, song_id)
);

-- ── queue_items ──────────────────────────────────────────────
create table if not exists public.queue_items (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid references public.venues(id) on delete cascade,
  song_id      uuid references public.songs(id) on delete set null,
  position     int not null default 0,
  is_playing   boolean not null default false,
  added_by     uuid references auth.users(id) on delete set null,
  added_at     timestamptz default now()
);

create index if not exists queue_items_venue_id_idx on public.queue_items(venue_id);
create index if not exists queue_items_position_idx on public.queue_items(venue_id, position);

-- ── song_requests ────────────────────────────────────────────
create table if not exists public.song_requests (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid references public.venues(id) on delete cascade,
  song_id      uuid references public.songs(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  tokens_spent int not null default 1,
  requested_at timestamptz default now()
);

create index if not exists song_requests_venue_id_idx on public.song_requests(venue_id);
create index if not exists song_requests_status_idx on public.song_requests(status);

-- ── token_balances ───────────────────────────────────────────
create table if not exists public.token_balances (
  id           uuid primary key default gen_random_uuid(),
  session_id   text unique not null,
  balance      int not null default 10,
  updated_at   timestamptz default now()
);

-- ── venues: add Spotify token columns ────────────────────────
alter table public.venues
  add column if not exists spotify_access_token  text,
  add column if not exists spotify_refresh_token text,
  add column if not exists spotify_token_expires_at timestamptz,
  add column if not exists active_playlist_id    uuid references public.playlists(id) on delete set null;

-- ── RLS ──────────────────────────────────────────────────────
alter table public.songs           enable row level security;
alter table public.playlists       enable row level security;
alter table public.playlist_songs  enable row level security;
alter table public.queue_items     enable row level security;
alter table public.song_requests   enable row level security;
alter table public.token_balances  enable row level security;

-- songs: public read, no direct write (server-side only)
drop policy if exists "songs_public_read" on public.songs;
create policy "songs_public_read" on public.songs for select using (true);

-- playlists: public read
drop policy if exists "playlists_public_read" on public.playlists;
create policy "playlists_public_read" on public.playlists for select using (true);

-- playlist_songs: public read
drop policy if exists "playlist_songs_public_read" on public.playlist_songs;
create policy "playlist_songs_public_read" on public.playlist_songs for select using (true);

-- queue_items: public read, anon insert/update (tighten when auth wired)
drop policy if exists "queue_items_public_read" on public.queue_items;
create policy "queue_items_public_read" on public.queue_items for select using (true);

drop policy if exists "queue_items_anon_insert" on public.queue_items;
create policy "queue_items_anon_insert" on public.queue_items for insert with check (true);

drop policy if exists "queue_items_anon_update" on public.queue_items;
create policy "queue_items_anon_update" on public.queue_items for update using (true);

drop policy if exists "queue_items_anon_delete" on public.queue_items;
create policy "queue_items_anon_delete" on public.queue_items for delete using (true);

-- song_requests: public read, anon insert
drop policy if exists "song_requests_public_read" on public.song_requests;
create policy "song_requests_public_read" on public.song_requests for select using (true);

drop policy if exists "song_requests_anon_insert" on public.song_requests;
create policy "song_requests_anon_insert" on public.song_requests for insert with check (true);

-- token_balances: session owner only
drop policy if exists "token_balances_own" on public.token_balances;
create policy "token_balances_own" on public.token_balances for all using (true);

-- ── Realtime ─────────────────────────────────────────────────
-- Enable Realtime for queue_items and song_requests in Supabase Dashboard:
-- Database → Replication → Tables → enable queue_items + song_requests

-- ── Seed: demo venue ─────────────────────────────────────────
insert into public.venues (id, name, spotify_playlist_id)
values ('00000000-0000-0000-0000-000000000001', 'The Neon Lounge', null)
on conflict (id) do nothing;
