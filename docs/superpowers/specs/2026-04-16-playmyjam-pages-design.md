# PlayMyJam Pages Design Spec
**Date:** 2026-04-16  
**Source:** stitch_live_song_queue.zip design files

---

## Overview

Implement 4 pages for PlayMyJam — a live venue music queue app — matching the Stitch designs pixel-for-pixel with mock data. All pages are mobile-first (max-w-md centered), dark theme only.

---

## Design System

| Token | Value |
|---|---|
| `primary` | `#f20da6` |
| `background-dark` | `#22101c` |
| `surface-dark` | `#392833` |
| `surface-muted` | `#ba9cb0` |
| Font | Plus Jakarta Sans (400/500/600/700/800) |
| Icons | Material Symbols Outlined |
| Border radius default | `1rem` |

Global CSS additions:
- Hide scrollbar utility (`.no-scrollbar`)
- Plus Jakarta Sans via `next/font/google`
- Material Symbols via `<link>` in layout head

---

## Pages

### 1. Login / Sign-up — `/login`

**Layout:** Single column, no bottom nav.

**Sections:**
1. Top bar — back arrow + "PlayMyJam" title (centered)
2. Hero — concert crowd image with gradient overlay + `primary/20` overlay
3. Headline — `"Let's get the party started"` with gradient text span
4. Subtext — venue queue description
5. Form:
   - Email field (mail icon, focus ring primary)
   - Password field (lock icon, visibility toggle)
   - "Forgot Password?" link (primary color)
   - "Log In" button — gradient `from-#f20da6 to-#b00b7a`, shadow glow
   - "Sign Up" button — outlined, border surface-dark
6. Divider — "Or login with"
7. Social buttons — Google (inline SVG) + Apple (material icon), 2-col grid

**Mock data:** None needed (form only)

---

### 2. Browse Music — `/browse`

**Layout:** Sticky header + sticky search/filter bar, scrollable song list, bottom nav.

**Sections:**
1. Sticky header — back arrow, "Browse Library" title, filter icon
2. Sticky search bar — rounded input with search icon
3. Horizontal filter pills (snap scroll, hide scrollbar):
   - All (active = primary bg), Pop, Rock, Hip-Hop, R&B, Electronic, Latin
4. Song list — divided rows:
   - 56×56 rounded-full album art
   - Song name (semibold) + artist (muted) + token cost (primary color + token icon)
   - Add button (add_circle icon, hover primary)
5. Bottom nav — Home, Browse (active), Queue, Profile

**Mock songs (10):**
| Song | Artist | Tokens |
|---|---|---|
| Blinding Lights | The Weeknd | 2 |
| Levitating | Dua Lipa | 3 |
| Peaches | Justin Bieber | 2 |
| Save Your Tears | The Weeknd | 1 |
| Kiss Me More | Doja Cat | 3 |
| Good 4 U | Olivia Rodrigo | 2 |
| Watermelon Sugar | Harry Styles | 2 |
| Stay | The Kid LAROI & Justin Bieber | 1 |
| Montero | Lil Nas X | 3 |
| drivers license | Olivia Rodrigo | 2 |

Album art: use Unsplash music-themed images via URL.

---

### 3. Live Queue — `/queue`

**Layout:** Scrollable main, fixed FAB, bottom nav.

**Sections:**
1. Sticky header — back arrow, venue name ("The Neon Lounge"), settings icon
2. "Now Playing" section:
   - "Şu An Çalıyor" heading + pulsing equalizer icon + "CANLI" badge
   - Vinyl disc animation: `animate-spin` on inner album art (10s linear infinite)
   - Gradient blur glow behind disc
   - Center hole dot
   - Song name (2xl bold) + artist + progress bar + time
3. "Next 10 Songs" list:
   - 56×56 square album art with hover play overlay
   - Song + artist
   - Wait time in minutes
   - Info button
   - Hover: `border-primary/50` + neon box-shadow
4. FAB — "Şarkı Ekle" button (blue gradient, fixed above bottom nav)
5. Bottom nav — Queue (active), Browse, Tokens, Profile

**Mock data:**
- Now playing: Levitating — Dua Lipa, 2:14 / 3:23, 66% progress
- Queue: 8 songs with staggered wait times

---

### 4. Request Song — `/request`

**Layout:** Resembles a bottom-sheet panel (full screen on mobile).

**Sections:**
1. Drag handle at top
2. Search input — rounded, dark surface bg
3. "Trend Şarkılar" section heading
4. Song rows:
   - Square album art (56×56, rounded-lg)
   - Song name + artist
   - Token cost pill button (surface-dark bg, rounded-full)

**Mock songs (6):** Turkish-flavored names + generic artist "DJ Kıvılcım"

---

## Shared Components

### `BottomNav`
Props: `active: 'home' | 'browse' | 'queue' | 'tokens' | 'profile'`  
Items: Home, Browse, Queue, Tokens, Profile  
Active item uses primary color; inactive uses `surface-muted`.

### Mock Data File
`lib/mock-data.ts` — exports `songs`, `queueSongs`, `trendingSongs`, `nowPlaying`.

---

## Routing

| Path | Page |
|---|---|
| `/` | Redirects to `/login` |
| `/login` | Login/Sign-up |
| `/browse` | Browse Music |
| `/queue` | Live Queue |
| `/request` | Request Song |

---

## Non-goals

- No real auth, no API calls
- No dark/light toggle (dark only)
- No admin dashboard (separate scope)
- No buy tokens page (separate scope)
