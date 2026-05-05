# PlayMyJam

A venue-specific song queue system for bars, clubs, and restaurants. Customers scan a QR code, browse the venue's playlist, and pay tokens to add songs to the live DJ queue. The admin manages everything from a real-time dashboard.

## Live Demo

**Production:** https://playmyjam-production.up.railway.app

> **Note:** The Spotify integration is in Development Mode. The admin Spotify tab shows real playlists from the connected account, and the import flow uses mock song data while Spotify's production API access is pending approval. All queue, token, and request features work normally.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Realtime WebSocket) |
| Auth | Supabase Auth (email + password, magic link) + httpOnly cookie (admin) |
| Music | Spotify Web API + Web Playback SDK |
| Deployment | Railway (production), Docker (self-hosted) |
| Package manager | Bun |

---

## Features

- **Customer flow** — Scan QR → browse playlist → pay 1 token → song added to live queue
- **Request flow** — Search any Spotify track → free submission → admin approves → song added to library
- **Real-time queue** — Supabase Realtime WebSocket keeps queue in sync across all devices
- **Token system** — 1 token = 50 ₺, bundle 5 = 200 ₺
- **Admin dashboard** — Requests tab, Queue tab, Spotify tab (connect + import), QR code tab
- **User auth** — Register / login (email+password or magic link), profile page, forgot password
- **Spotify playback** — Web Playback SDK for in-browser playback (requires Spotify Premium on admin device)
- **Multi-venue** — Switch venues via `NEXT_PUBLIC_VENUE_ID` env var, no code changes needed
- **Docker** — Multi-stage Dockerfile, ~150 MB image

---

## Local Setup

### Prerequisites

- [Bun](https://bun.sh) v1.x
- A [Supabase](https://supabase.com) project
- A [Spotify Developer App](https://developer.spotify.com/dashboard)

### 1. Clone and install

```bash
git clone https://github.com/CaganKoyunseven/PlayMyJam.git
cd PlayMyJam
bun install
```

### 2. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback

ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourpassword

# Optional — defaults to the demo venue UUID
NEXT_PUBLIC_VENUE_ID=00000000-0000-0000-0000-000000000001
```

### 3. Database setup

Run these SQL files in order in the Supabase SQL Editor:

```
supabase/migration.sql   — main schema + RLS + demo venue seed
supabase/events.sql      — events table
supabase/admin.sql       — admin patches
supabase/users.sql       — profiles table + auth trigger
```

Then in **Supabase Dashboard → Database → Replication → Tables**, enable Realtime for:
`events`, `queue_items`, `song_requests`

Also enable **Email + Password** and **Magic Link** providers under **Authentication → Providers**.

### 4. Spotify app settings

In your Spotify Developer Dashboard app settings, add this redirect URI:

```
http://localhost:3000/api/spotify/callback
```

### 5. Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin panel: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Docker

```bash
docker build -t playmyjam .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SPOTIFY_CLIENT_ID=... \
  -e SPOTIFY_CLIENT_SECRET=... \
  -e SPOTIFY_REDIRECT_URI=https://your-domain.com/api/spotify/callback \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=secret \
  playmyjam
```

---

## Team

| Name | Role |
|------|------|
| Cagan Koyunseven | Full-stack development |
| Ozer Gokalp Sezer | Full-stack development |

---

## Known Limitations

### Spotify Developer Mode

The Spotify app is currently in **Development Mode** (unreviewed). This means:

- The Spotify API blocks track data endpoints (`/tracks?ids=...`, `/playlists/{id}/tracks`) with HTTP 403, even for valid OAuth tokens
- The `/me/playlists` endpoint works normally — real playlists are displayed in the admin dashboard
- **Workaround for demo**: When all real data sources fail, `importPlaylist` seeds the playlist with well-known mock songs so the browse / queue / token flow can be demonstrated end-to-end
- The active playlist is shown prominently in the admin Spotify tab with an **ACTIVE** badge

**To enable full Spotify integration**, apply for quota extension in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) under your app. Once approved, the mock data fallback is bypassed automatically and real track data flows through.

### Spotify Playback

The Web Playback SDK requires a **Spotify Premium** account on the admin's device. Free accounts cannot use in-browser playback.
