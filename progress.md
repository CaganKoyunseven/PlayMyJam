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
| Auth | Supabase Auth (email+password + magic link) + username/password httpOnly cookie (admin) |

---

## Database Schema

### Tables (`supabase/migration.sql` + `supabase/events.sql` + `supabase/users.sql`)

```
songs              — Track catalog imported from Spotify
playlists          — Venue playlists (imported from Spotify)
playlist_songs     — Playlist-song join table
queue_items        — Active queue (is_playing, position)
song_requests      — Out-of-playlist track requests (requires admin approval)
token_balances     — Anonymous session-based token balances
venues             — Venue records + Spotify tokens
events             — Event bus table (Realtime pub/sub)
profiles           — User profiles (username, email) — linked to auth.users
```

### SQL Execution Order
1. `supabase/migration.sql` — Main schema + RLS + demo venue seed
2. `supabase/events.sql` — Events table
3. `supabase/admin.sql` — Admin patches (session_id column, extra RLS policies)
4. `supabase/users.sql` — Profiles table, RLS, signup trigger (auto-creates profile on new user)
5. `supabase/virtual-player.sql` — Adds `started_at` timestamp on `queue_items` for the Virtual Player

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
  tokens/page.tsx           — Token purchase (1 token = 50₺, bundle 5 = 200₺)
  profile/page.tsx          — User profile (username edit, change password, sign out)
  login/page.tsx            — Login (password tab + magic link tab)
  register/page.tsx         — Register (username + email + password)
  forgot-password/page.tsx  — Request password reset email
  reset-password/page.tsx   — Set new password (from reset link)

  api/
    spotify/callback/       — Spotify OAuth callback → save tokens to DB
    spotify/token/          — Serve venue access token to Playback SDK
    spotify/search/         — Server-side Spotify search proxy (client can't use server env vars)
    spotify/import/         — Server-side playlist import proxy (client can't use SPOTIFY_CLIENT_SECRET)
    spotify/disconnect/     — Clear venue Spotify tokens (force fresh OAuth re-auth)
    admin/login/            — POST: validate ADMIN_USERNAME + ADMIN_PASSWORD, set httpOnly cookie
    admin/logout/           — POST: clear admin session cookie
    auth/login/             — POST: resolve username → email (for signInWithPassword)
    auth/check-username/    — GET: check username availability in profiles table

lib/
  supabase.ts               — Supabase client (with build-time placeholder)
  constants.ts              — DEFAULT_VENUE_ID and other constants
  db.ts                     — All database operations
  auth-context.tsx          — React context: AuthProvider + useAuth() hook (user, session, loading)
  event-bus.ts              — EventBus: publish (write to DB) + subscribe (Realtime)
  spotify-auth.ts           — Client Credentials cache, OAuth flow, token refresh
  spotify-api.ts            — Spotify API calls (search, playlists, playback)
  spotify-playback.ts       — Web Playback SDK init/teardown
  observers/
    index.ts                — initObservers() / teardownObservers()
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
  users.sql                 — Profiles table + RLS + auto-create-profile trigger

proxy.ts                    — Edge middleware: protects /admin/dashboard, validates httpOnly cookie
app/admin/dashboard/layout.tsx — Server component double-check for admin auth
```

---

## Event-Driven Architecture

The app is built on the Observer Pattern. All critical actions are written to the `events` table and delivered to all connected clients via Supabase Realtime WebSocket.

### Event Types

| Event | Triggered By | Effect |
|-------|-------------|--------|
| `SONG_REQUESTED` | `createSongRequest()` | Appears in admin panel |
| `SONG_APPROVED` | `approveRequest()` | song added to library (not queue directly) |
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
  → sets httpOnly cookie pmj_admin (sameSite: 'lax' — required for Spotify OAuth redirect chain)
  → proxy.ts guards /admin/dashboard — redirects if cookie invalid (Next.js 16: middleware → proxy)

/admin/dashboard (3 tabs):
  → "Requests" tab: pending song_requests (Realtime)
      → Approve → approveRequest() → SONG_ADDED_TO_LIBRARY event
      → Reject  → rejectRequest()
  → "Queue" tab: active queue_items (Realtime)
      → ▶ Play → setNowPlaying() → SONG_STARTED → playback-observer
      → 🗑 Remove → removeQueueItem()
  → "Spotify" tab:
      → Connect Spotify Account → /api/spotify/connect (server route, client can't read SPOTIFY_CLIENT_ID)
      → OAuth Authorization Code Flow → /api/spotify/callback → tokens saved to venues table
      → Lists venue's Spotify playlists → Import → POST /api/spotify/import (server proxy)
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

### Supabase RLS Requirements
The `venues` table requires RLS policies for the Supabase anon key to read/write tokens:
```sql
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues_read"  ON public.venues FOR SELECT USING (true);
CREATE POLICY "venues_write" ON public.venues FOR UPDATE USING (true) WITH CHECK (true);
```
Without these, `spotify_access_token` stays NULL after OAuth (PostgREST ignores raw Postgres GRANT).

### Known Spotify Issues / Debugging

**Import returns 0 tracks or 403 "Forbidden"** (Status: Investigating / Patching)

**Root cause found (2026-05-05):** Spotify apps in "Development Mode" have severe restrictions on the `/playlists/{id}/tracks` endpoint and the `tracks` object inside `/playlists/{id}`. Even with correct scopes (`playlist-read-private`), the API returns 403 Forbidden for sub-endpoints or simply omits the `tracks` field from the main playlist response if the user is not explicitly allowlisted in the Spotify Dev Dashboard.

**What was tried:**
1. **Fallback API calls:** Tried using Client Credentials (CC) instead of Venue (OAuth) token. CC works for public playlists but Spotify still blocks `/tracks` in Dev Mode.
2. **Field filtering:** Tried `?fields=tracks(items(track(id...)))` to minimize response size — no effect, still blocked.
3. **Hybrid Scraping:** Fetched public page and extracted track IDs via regex. This bypassed the "playlist tracks" block but Step 4 (enrichment via `/tracks?ids=...`) still failed with 403 when using CC token.
4. **API Priority (Applied 2026-05-05):** Modified `importPlaylist` to check the official API first. Since the admin is an allowlisted Test User, the API *does* return tracks for them.
5. **Venue Token for Enrichment (Planned):** Even after getting IDs via API, the batch enrichment call (`/tracks?ids=...`) failed with 403 when using Client Credentials. We are switching to the Venue (OAuth) token for this step as well to leverage the user's allowlisted status.

**Current Solution: API-First + Venue Enrichment**
1. **API Try:** Try fetching playlist details via API using Venue Token.
2. **Scrape Fallback:** If API fails or returns 0 tracks, fallback to scraping the public page.
3. **Venue-Authorized Enrichment:** Call the `/tracks?ids=...` endpoint using the Venue (OAuth) token instead of Client Credentials. This ensures that allowlisted users can fetch track metadata even in Dev Mode.
4. **RLS Bypass via Admin Client (Applied 2026-05-05):** Created `lib/supabase-admin.ts` using `SUPABASE_SERVICE_ROLE_KEY`. All server-side writes (playlist import, token refresh, venue updates) now use `supabaseAdmin` to bypass RLS restrictions, resolving the "Failed to save playlist record" error.
5. **Mock Playlist Fallback (Applied 2026-05-05):** `getVenuePlaylists` now returns mock playlists if the Spotify API fails. This ensures the Admin panel remains functional even if the Spotify connection is dead, allowing users to "import" mock data and test the full workflow.
6. **Auto-Active Playlist (Applied 2026-05-05):** `importPlaylist` now automatically updates the venue's `active_playlist_id` upon successful import (real or mock).

**Remaining Tasks / Blockers:**
- [x] **Lint/Prettier Fixes:** Fixed formatting and 'any' type issues in `spotify-api.ts` and `debug/route.ts`.
- [ ] **Verification:** Confirm that Venue Token enrichment bypasses the 403 in Dev Mode.
- [ ] **Extended Quota:** Long-term fix is to apply for "Extended Quota" on the Spotify Developer Dashboard to remove Dev Mode limits.

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
5a5408e  revert: remove --experimental-https, back to plain next dev
f3e6a10  fix: proxy.ts export renamed to proxy (Next.js 16)
c664580  fix: Spotify connect + search via server routes (client can't access server env vars)
c4bb713  feat: admin panel Spotify tab (connect + playlist import)
85fd81d  fix: Spotify search via server route, admin username+password auth with httpOnly cookie
92e2850  docs: add progress.md
5ed791f  feat: two-track request system — playlist direct-to-queue vs out-of-playlist admin approval
288d9f2  feat: admin panel with PIN login, request approval, queue management
4afae9a  feat: add event-driven architecture with observer pattern
02011b8  feat: Spotify integration, Supabase Realtime queue, token system, venue playlist import
```

---

## Known Gaps / Next Steps

- [ ] Token purchase flow (`/tokens` page UI done, 1=50₺/5=200₺ — no real payment gateway wired)
- [x] User auth — Supabase Auth with email+password + magic link
- [x] User profile (`/profile` — username edit, change password, sign out)
- [x] Register, Login, Forgot Password, Reset Password pages
- [x] Auth guards — browse open to all; request/queue-add requires login (toast + login link)
- [x] Admin: queue reordering — up/down arrow buttons on each queue item
- [x] SONG_FINISHED event — auto-advance: Spotify SDK `player_state_changed` detects track end → `advanceQueue()` removes finished song and sets next as playing
- [x] QR code generation — admin "QR" tab shows scannable QR linking to `/queue`
- [x] Zero-token guard with top-up prompt on browse (already implemented — toast + early return)
- [x] Admin dashboard double-protected (proxy.ts matcher + server component layout.tsx)
- [x] Multi-venue: `DEFAULT_VENUE_ID` now reads from `NEXT_PUBLIC_VENUE_ID` env var (fallback: demo venue `00000000-0000-0000-0000-000000000001`). To add a new venue: insert row in `venues` table → set env var → done. No code changes needed.
- [x] `/venue` standalone page redirect → `/admin/dashboard`
- [x] Docker deployment: `Dockerfile` (multi-stage, standalone output, ~150MB image) + `.dockerignore` added. Set `NEXT_PUBLIC_VENUE_ID` in deployment env vars to select venue.
- [ ] **[BLOCKED]** Spotify OAuth requires HTTPS redirect URI. `http://localhost` rejected by Spotify Dashboard. `https://localhost` rejected by Spotify as "Insecure". mkcert generates valid cert but Chrome doesn't load it reliably in dev. **Fix: deploy to production and use real HTTPS domain. Update `SPOTIFY_REDIRECT_URI` env var after deploy.**
- [x] Run modified ALTER TABLE SQL in Supabase dashboard (add `email` column + trigger — profiles table already existed)
- [x] Enable Email+Password and Magic Link providers in Supabase Auth settings
- [x] `sameSite: 'lax'` on `pmj_admin` cookie — `strict` caused cookie to be dropped during Spotify OAuth cross-site redirect chain, landing admin back on login page
- [x] `checkSpotifyConnection()` reads Supabase DB directly (not Client Credentials token) — client-side can't use server env vars
- [x] Supabase RLS policies on `venues` table — anon key needs explicit policies, raw `GRANT` is ignored by PostgREST
- [x] `/api/spotify/import` server route — browser can't use `SPOTIFY_CLIENT_SECRET` for token refresh; import now proxied through server
- [x] **[DEMO WORKAROUND]** Spotify Dev Mode blocks `/tracks?ids=...` and `/playlists/{id}/tracks` (403/empty). Root cause: Spotify platform restriction on unreviewed apps. **Fix:** `importPlaylist` now uses `supabaseAdmin` with `SERVICE_ROLE_KEY` to bypass RLS. It falls through API → Scrape → **Mock Seed** so import always succeeds. `getVenuePlaylists` also returns mock playlists on error to keep Admin panel functional.
- [x] Active playlist UI in admin Spotify tab — automated `active_playlist_id` update during import; most recently imported playlist shown in green banner at top; ACTIVE badge on corresponding list item.
- [x] **Unit Tests (Passed 2026-05-05):** 92 tests passing. Coverage for lib, API routes, and event bus verified.
- [x] **Virtual Player (Applied 2026-05-05):** Added `started_at timestamptz` column to `queue_items`. `setNowPlaying` writes the current timestamp and clears `started_at` on all other rows. New `components/virtual-player.tsx` ticks every 500ms and computes `progress = Date.now() - startedAt` so playback progress works without the Spotify Web Playback SDK. Queue page (`/queue`) renders the full virtual player as the public Now Playing UI; admin dashboard renders a compact progress bar inside the Now Playing strip with `autoAdvance` enabled — when virtual elapsed ≥ duration, the admin client calls `advanceQueue()` to remove the finished song and promote the next one. Run `supabase/virtual-player.sql` once to add the column.

---

> **Note:** Read and update this file before every push.  
> Specifically document: new pages, new event types, DB schema changes, and flow updates.
