# PlayMyJam — Project Progress

## What Is This?

A venue-specific song queue system for bars, clubs, and restaurants.  
Customers scan a QR code → browse the venue's playlist → pay tokens to add songs to the queue.  
The DJ/admin manages the queue from a panel and approves out-of-playlist song requests.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.3 (App Router) |
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Backend/DB | Supabase (PostgreSQL + Realtime WebSocket) |
| Music | Spotify Web API + Web Playback SDK |
| Auth | Supabase Auth (users) + username/password httpOnly cookie (admin) |

---

## Database Schema

### Tables (`supabase/migration.sql` + `supabase/events.sql`)

```
songs              — Track catalog imported from Spotify
playlists          — Venue playlists (imported from Spotify)
playlist_songs     — Playlist-song join table
queue_items        — Active queue (is_playing, position)
song_requests      — Out-of-playlist track requests (requires admin approval)
token_balances     — Anonymous session-based token balances
venues             — Venue records + Spotify tokens
events             — Event bus table (Realtime pub/sub)
```

### SQL Execution Order
1. `supabase/migration.sql` — Main schema + RLS + demo venue seed
2. `supabase/events.sql` — Events table
3. `supabase/admin.sql` — Admin patches (session_id column, extra RLS policies)

### Supabase Dashboard Steps
- **Database → Replication → Tables** → enable Realtime for `events`, `queue_items`, `song_requests`

---

## Project Structure

```
app/
  page.tsx                  — Home / landing
  layout.tsx                — Root layout (NotificationListener included)
  queue/page.tsx            — Live queue + Now Playing
  browse/page.tsx           — Browse venue playlist, pay token, add to queue
  request/page.tsx          — Search Spotify, request out-of-playlist song (free)
  admin/page.tsx            — Admin login (username + password form)
  admin/dashboard/page.tsx  — Admin panel: Requests tab, Queue tab, Spotify tab (connect + import)
  venue/page.tsx            — Venue settings (standalone page, same as admin Spotify tab)
  tokens/page.tsx           — Token purchase (placeholder)
  profile/page.tsx          — User profile (placeholder)
  login/page.tsx            — Login page (placeholder)

  api/
    spotify/callback/       — Spotify OAuth callback → save tokens to DB
    spotify/token/          — Serve venue access token to Playback SDK
    spotify/search/         — Server-side Spotify search proxy (client can't use server env vars)
    admin/login/            — POST: validate ADMIN_USERNAME + ADMIN_PASSWORD, set httpOnly cookie
    admin/logout/           — POST: clear admin session cookie

lib/
  supabase.ts               — Supabase client (with build-time placeholder)
  constants.ts              — DEFAULT_VENUE_ID and other constants
  db.ts                     — All database operations
  event-bus.ts              — EventBus: publish (write to DB) + subscribe (Realtime)
  spotify-auth.ts           — Client Credentials cache, OAuth flow, token refresh
  spotify-api.ts            — Spotify API calls (search, playlists, playback)
  spotify-playback.ts       — Web Playback SDK init/teardown
  observers/
    index.ts                — initObservers() / teardownObservers()
    queue-observer.ts       — SONG_APPROVED → insertQueueItem
    token-observer.ts       — TOKEN_PURCHASED → credit balance
    playback-observer.ts    — SONG_STARTED → playTrack()

components/
  bottom-nav.tsx            — Bottom navigation bar
  now-playing.tsx           — Spotify Playback SDK player + controls
  notification-listener.tsx — Global toast (SONG_ADDED_TO_LIBRARY event)

supabase/
  migration.sql             — Main DB schema
  events.sql                — Events table
  admin.sql                 — Admin patches (session_id column, update RLS)

middleware.ts               — Edge middleware: protects /admin/dashboard, validates httpOnly cookie
```

---

## Event-Driven Architecture

The app is built on the Observer Pattern. All critical actions are written to the `events` table and delivered to all connected clients via Supabase Realtime WebSocket.

### Event Types

| Event | Triggered By | Effect |
|-------|-------------|--------|
| `SONG_REQUESTED` | `createSongRequest()` | Appears in admin panel |
| `SONG_APPROVED` | `approveRequest()` | queue-observer → song added to queue |
| `SONG_REJECTED` | `rejectRequest()` | Removed from request list |
| `SONG_ADDED_TO_QUEUE` | `insertQueueItem()` | Queue page updates |
| `SONG_ADDED_TO_LIBRARY` | `approveRequest()` | Notification sent to all clients |
| `SONG_STARTED` | `setNowPlaying()` | playback-observer → Spotify SDK |
| `SONG_FINISHED` | (manual for now) | — |
| `TOKEN_SPENT` | `deductToken()` | Token balance decremented |
| `TOKEN_PURCHASED` | token-observer | Balance credited |
| `QUEUE_REORDERED` | (manual for now) | — |

### EventBus Flow
```
publish(type, payload)
  → supabase.from('events').insert(...)
    → Supabase Realtime WebSocket
      → all subscribe() listeners fire
        → observer handler runs
```

---

## User Flows

### Flow 1 — Add Song from Playlist (Browse)
```
/browse → venue playlist displayed
  → select song → deductToken() → balance decremented → TOKEN_SPENT event
  → insertQueueItem() → write to queue_items → SONG_ADDED_TO_QUEUE event
  → redirect to /queue (updates in real-time)
```
> No admin approval needed. Only songs from the venue's imported playlists.

### Flow 2 — Out-of-Playlist Song Request (Request)
```
/request → search Spotify (Client Credentials, debounced 400ms)
  → select song → createSongRequest() → free, no token
  → upsert to songs table → insert 'pending' into song_requests → SONG_REQUESTED
  → appears in admin panel
    → Admin approves:
        approveRequest() → song added to all venue playlists
        → SONG_ADDED_TO_LIBRARY event
          → requester: "Your request was approved!" (green toast)
          → everyone else: "New song added: {title}" (purple toast)
        → song now available in /browse to add to queue with a token
    → Admin rejects:
        rejectRequest() → status: 'rejected' → SONG_REJECTED
```

### Flow 3 — Admin Panel
```
/admin → username + password form
  → POST /api/admin/login → validates ADMIN_USERNAME + ADMIN_PASSWORD env vars
  → sets httpOnly cookie pmj_admin
  → middleware.ts guards /admin/dashboard — redirects if cookie invalid

/admin/dashboard (3 tabs):
  → "Requests" tab: pending song_requests (Realtime)
      → Approve → approveRequest() → SONG_ADDED_TO_LIBRARY event
      → Reject  → rejectRequest()
  → "Queue" tab: active queue_items (Realtime)
      → ▶ Play → setNowPlaying() → SONG_STARTED → playback-observer
      → 🗑 Remove → removeQueueItem()
  → "Spotify" tab:
      → Connect Spotify Account (OAuth) → getSpotifyAuthUrl()
      → Lists venue's Spotify playlists → Import → importPlaylist()
      → Shows already-imported playlists
```

### Flow 4 — Venue Setup
```
/venue → check Spotify connection status
  → "Connect Spotify Account" → OAuth Authorization Code Flow
    → /api/spotify/callback → tokens saved to venues table
  → playlists listed → Import
    → importPlaylist() → songs + playlist_songs upsert
    → songs now appear in /browse
```

---

## Spotify Integration

### Flows Used

| Flow | Used For |
|------|---------|
| Client Credentials | Track search (`searchTracks`), general API calls |
| Authorization Code | Venue Spotify account linking, playlist import |
| Web Playback SDK | In-browser playback (requires Spotify Premium) |

### Token Management
- Client Credentials token → in-memory cache (5-min TTL check)
- Venue access token → stored in `venues` table, refreshed via `refreshVenueToken()` when near expiry
- Playback SDK token → served from `/api/spotify/token` route handler

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
ADMIN_USERNAME=           # server-only, never exposed to client
ADMIN_PASSWORD=           # server-only, stored as httpOnly cookie hash
```

---

## Git Rules

- **Branch**: `feat/spotify-supabase-full` (never push directly to main)
- **Commit user**: `koyunsevencagan@gmail.com` — this account only
- **Co-author**: Claude is never added as a co-author
- Each meaningful feature gets its own commit

### Commit History (key commits on this branch)
```
85fd81d  fix: Spotify search via server route, admin username+password auth with httpOnly cookie
92e2850  docs: add progress.md
5ed791f  feat: two-track request system — playlist direct-to-queue vs out-of-playlist admin approval
288d9f2  feat: admin panel with PIN login, request approval, queue management
4afae9a  feat: add event-driven architecture with observer pattern
02011b8  feat: Spotify integration, Supabase Realtime queue, token system, venue playlist import
```

---

## Known Gaps / Next Steps

- [ ] Token purchase flow (`/tokens` page is placeholder)
- [ ] User profile (`/profile` placeholder)
- [ ] Admin: drag-and-drop queue reordering (QUEUE_REORDERED event is ready)
- [ ] SONG_FINISHED event — auto-advance to next song when track ends
- [ ] QR code generation (venue-specific link)
- [ ] Auth: currently anonymous session (localStorage UUID), real Supabase Auth can be added
- [ ] Zero-token guard with top-up prompt on browse
- [ ] Admin: option to also add approved request directly to queue (currently only adds to library)
- [ ] Multi-venue support (DEFAULT_VENUE_ID is hardcoded for now)
- [ ] `/venue` standalone page is now redundant — admin Spotify tab replaces it

---

> **Note:** Read and update this file before every push.  
> Specifically document: new pages, new event types, DB schema changes, and flow updates.
