# PlayMyJam Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 mobile-first pages (Login, Browse, Queue, Request) matching the Stitch design files with 100% visual fidelity using mock data.

**Architecture:** Next.js 16 App Router, all pages are Server Components (no client state needed for this mock phase). Shared design tokens in `globals.css` via Tailwind v4 `@theme`. Mock data in `lib/mock-data.ts`. Shared `BottomNav` as a Server Component.

**Tech Stack:** Next.js 16.2.3, React 19, Tailwind CSS v4, Plus Jakarta Sans (next/font/google), Material Symbols Outlined (Google CDN link)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/globals.css` | Modify | Add design tokens, font var, scrollbar utility |
| `app/layout.tsx` | Modify | Plus Jakarta Sans font + Material Symbols `<link>` |
| `lib/mock-data.ts` | Create | All mock songs, queue, now-playing data |
| `components/bottom-nav.tsx` | Create | Shared bottom navigation bar |
| `app/page.tsx` | Modify | Redirect to `/login` |
| `app/login/page.tsx` | Create | Login / Sign-up page |
| `app/browse/page.tsx` | Create | Browse music library page |
| `app/queue/page.tsx` | Create | Live song queue page |
| `app/request/page.tsx` | Create | Request a song page |

---

## Task 1: Design System — globals.css + layout.tsx

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

### globals.css

- [ ] **Step 1: Replace `app/globals.css` with the following**

```css
@import "tailwindcss";

:root {
  --background: #22101c;
  --foreground: #ffffff;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: #f20da6;
  --color-background-dark: #22101c;
  --color-background-light: #f8f5f7;
  --color-surface-dark: #392833;
  --color-surface-muted: #ba9cb0;
  --font-display: var(--font-plus-jakarta);
  --radius: 1rem;
  --radius-lg: 1.5rem;
  --radius-xl: 2rem;
  --radius-full: 9999px;
}

@utility no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
@utility no-scrollbar::-webkit-scrollbar {
  display: none;
}
```

### layout.tsx

- [ ] **Step 2: Replace `app/layout.tsx` with the following**

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PlayMyJam",
  description: "Queue up your favorite tracks at your local venue.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-screen bg-background-dark font-display text-white antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Start dev server and confirm no build errors**

```bash
bun run dev
```

Expected: Server starts on http://localhost:3000, no TypeScript/build errors in the terminal.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add PlayMyJam design system tokens and fonts"
```

---

## Task 2: Mock Data

**Files:**
- Create: `lib/mock-data.ts`

- [ ] **Step 1: Create `lib/mock-data.ts`**

```ts
export type Song = {
  id: string;
  title: string;
  artist: string;
  tokens: number;
  albumArt: string;
};

export type QueueSong = Song & {
  waitMinutes: number;
  requestedBy?: string;
};

export const browseSongs: Song[] = [
  {
    id: "1",
    title: "Blinding Lights",
    artist: "The Weeknd",
    tokens: 2,
    albumArt:
      "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop",
  },
  {
    id: "2",
    title: "Levitating",
    artist: "Dua Lipa",
    tokens: 3,
    albumArt:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop",
  },
  {
    id: "3",
    title: "Peaches",
    artist: "Justin Bieber",
    tokens: 2,
    albumArt:
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=100&h=100&fit=crop",
  },
  {
    id: "4",
    title: "Save Your Tears",
    artist: "The Weeknd",
    tokens: 1,
    albumArt:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop",
  },
  {
    id: "5",
    title: "Kiss Me More",
    artist: "Doja Cat",
    tokens: 3,
    albumArt:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop",
  },
  {
    id: "6",
    title: "Good 4 U",
    artist: "Olivia Rodrigo",
    tokens: 2,
    albumArt:
      "https://images.unsplash.com/photo-1619983081563-430f63602796?w=100&h=100&fit=crop",
  },
  {
    id: "7",
    title: "Watermelon Sugar",
    artist: "Harry Styles",
    tokens: 2,
    albumArt:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop",
  },
  {
    id: "8",
    title: "Stay",
    artist: "The Kid LAROI & Justin Bieber",
    tokens: 1,
    albumArt:
      "https://images.unsplash.com/photo-1571974599782-87624638275e?w=100&h=100&fit=crop",
  },
  {
    id: "9",
    title: "Montero",
    artist: "Lil Nas X",
    tokens: 3,
    albumArt:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=100&h=100&fit=crop",
  },
  {
    id: "10",
    title: "drivers license",
    artist: "Olivia Rodrigo",
    tokens: 2,
    albumArt:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop",
  },
];

export const nowPlaying: Song & { currentTime: string; totalTime: string; progress: number } = {
  id: "2",
  title: "Levitating",
  artist: "Dua Lipa",
  tokens: 3,
  albumArt:
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
  currentTime: "2:14",
  totalTime: "3:23",
  progress: 66,
};

export const queueSongs: QueueSong[] = [
  { id: "1", title: "Blinding Lights", artist: "The Weeknd", tokens: 2, albumArt: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop", waitMinutes: 3 },
  { id: "7", title: "Watermelon Sugar", artist: "Harry Styles", tokens: 2, albumArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop", waitMinutes: 7 },
  { id: "6", title: "Good 4 U", artist: "Olivia Rodrigo", tokens: 2, albumArt: "https://images.unsplash.com/photo-1619983081563-430f63602796?w=100&h=100&fit=crop", waitMinutes: 11 },
  { id: "4", title: "Save Your Tears", artist: "The Weeknd & Ariana Grande", tokens: 1, albumArt: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop", waitMinutes: 15 },
  { id: "8", title: "Stay", artist: "The Kid LAROI & Justin Bieber", tokens: 1, albumArt: "https://images.unsplash.com/photo-1571974599782-87624638275e?w=100&h=100&fit=crop", waitMinutes: 18 },
  { id: "5", title: "Kiss Me More", artist: "Doja Cat", tokens: 3, albumArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop", waitMinutes: 22 },
  { id: "9", title: "Montero", artist: "Lil Nas X", tokens: 3, albumArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=100&h=100&fit=crop", waitMinutes: 26 },
  { id: "3", title: "Peaches", artist: "Justin Bieber", tokens: 2, albumArt: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=100&h=100&fit=crop", waitMinutes: 30 },
];

export const trendingSongs: Song[] = [
  { id: "t1", title: "Gecenin Ritmi", artist: "DJ Kıvılcım", tokens: 2, albumArt: "https://images.unsplash.com/photo-1571974599782-87624638275e?w=100&h=100&fit=crop" },
  { id: "t2", title: "Yıldızlar Altında", artist: "DJ Kıvılcım", tokens: 2, albumArt: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=100&h=100&fit=crop" },
  { id: "t3", title: "Ateşli Dans", artist: "DJ Kıvılcım", tokens: 2, albumArt: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop" },
  { id: "t4", title: "Gizemli Gece", artist: "DJ Kıvılcım", tokens: 2, albumArt: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop" },
  { id: "t5", title: "Sonsuz Yolculuk", artist: "DJ Kıvılcım", tokens: 2, albumArt: "https://images.unsplash.com/photo-1619983081563-430f63602796?w=100&h=100&fit=crop" },
  { id: "t6", title: "Neon Rüyalar", artist: "DJ Kıvılcım", tokens: 3, albumArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop" },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mock-data.ts
git commit -m "feat: add mock data for songs, queue, and trending"
```

---

## Task 3: BottomNav Component

**Files:**
- Create: `components/bottom-nav.tsx`

- [ ] **Step 1: Create `components/bottom-nav.tsx`**

```tsx
import Link from "next/link";

type NavItem = "home" | "browse" | "queue" | "tokens" | "profile";

export default function BottomNav({ active }: { active: NavItem }) {
  const items: { id: NavItem; icon: string; label: string; href: string }[] = [
    { id: "queue", icon: "queue_music", label: "Queue", href: "/queue" },
    { id: "browse", icon: "search", label: "Browse", href: "/browse" },
    { id: "tokens", icon: "token", label: "Tokens", href: "/tokens" },
    { id: "profile", icon: "person", label: "Profile", href: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto border-t border-white/5 bg-surface-dark px-6 py-3 flex justify-between items-center">
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
              isActive ? "text-primary" : "text-surface-muted hover:text-white"
            }`}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/bottom-nav.tsx
git commit -m "feat: add shared BottomNav component"
```

---

## Task 4: Root Redirect

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx` with redirect to `/login`**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: redirect root to /login"
```

---

## Task 5: Login / Sign-up Page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create `app/login/page.tsx`**

```tsx
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white max-w-md mx-auto">
      {/* Top Bar */}
      <div className="flex items-center p-4 pb-2 justify-between z-10">
        <button className="flex size-12 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-12">
          PlayMyJam
        </h2>
      </div>

      {/* Hero Image */}
      <div className="w-full px-0">
        <div
          className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden min-h-[240px] relative"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=480&h=240&fit=crop')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent" />
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: "#f20da6", mixBlendMode: "overlay" }}
          />
        </div>
      </div>

      {/* Header Text */}
      <div className="px-6 pt-4 pb-2 text-center">
        <h1 className="tracking-tight text-[32px] font-extrabold leading-tight mb-2">
          Let&apos;s get the{" "}
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: "linear-gradient(to right, #f20da6, #a855f7)",
            }}
          >
            party started
          </span>
        </h1>
        <p className="text-surface-muted text-base font-normal leading-relaxed">
          Queue up your favorite tracks and vote for what plays next at your
          local venue.
        </p>
      </div>

      {/* Form */}
      <form className="flex flex-col gap-5 px-6 py-6 w-full">
        {/* Email */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold ml-1">Email</span>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-surface-muted group-focus-within:text-primary transition-colors">
              mail
            </span>
            <input
              type="email"
              placeholder="hello@example.com"
              className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-4 text-base placeholder:text-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
            />
          </div>
        </label>

        {/* Password */}
        <label className="flex flex-col gap-2">
          <div className="flex justify-between items-center ml-1">
            <span className="text-sm font-semibold">Password</span>
            <a href="#" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              Forgot Password?
            </a>
          </div>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-surface-muted group-focus-within:text-primary transition-colors">
              lock
            </span>
            <input
              type="password"
              placeholder="Enter your password"
              className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-12 text-base placeholder:text-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-muted hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">visibility</span>
            </button>
          </div>
        </label>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            type="submit"
            className="h-14 w-full rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #f20da6 0%, #b00b7a 100%)",
              boxShadow: "0 4px 20px rgba(242,13,166,0.3)",
            }}
          >
            Log In
            <span className="material-symbols-outlined text-[20px]">login</span>
          </button>
          <button
            type="button"
            className="h-14 w-full rounded-xl bg-transparent border-2 border-surface-dark text-white font-bold text-lg hover:bg-surface-dark hover:border-primary/30 active:scale-[0.98] transition-all duration-200"
          >
            Sign Up
          </button>
        </div>
      </form>

      {/* Social Login */}
      <div className="px-6 pb-8">
        <div className="relative py-2 flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative bg-background-dark px-4 text-xs uppercase text-surface-muted font-bold tracking-wider">
            Or login with
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button className="h-14 flex items-center justify-center gap-3 rounded-xl bg-surface-dark text-white font-semibold hover:bg-[#4a3543] transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Google</span>
          </button>
          <button className="h-14 flex items-center justify-center gap-3 rounded-xl bg-surface-dark text-white font-semibold hover:bg-[#4a3543] transition-colors">
            <span className="material-symbols-outlined text-[24px]">phone_iphone</span>
            <span>Apple</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Visit http://localhost:3000/login — verify:**
  - Dark background (`#22101c`)
  - Concert hero image with pink overlay
  - "Let's get the party started" with gradient text
  - Email + password form with icons
  - Pink gradient "Log In" button
  - "Sign Up" outlined button
  - Google + Apple social buttons

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: add Login/Sign-up page matching Stitch design"
```

---

## Task 6: Browse Music Page

**Files:**
- Create: `app/browse/page.tsx`

- [ ] **Step 1: Create `app/browse/page.tsx`**

```tsx
import BottomNav from "@/components/bottom-nav";
import { browseSongs } from "@/lib/mock-data";

const genres = ["All", "Pop", "Rock", "Hip-Hop", "R&B", "Electronic", "Latin"];

export default function BrowsePage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark pb-24 max-w-md mx-auto">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background-dark/95 backdrop-blur-md">
        <button className="flex size-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center">
          Browse Library
        </h2>
        <button className="flex size-10 items-center justify-center rounded-full text-white active:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">filter_list</span>
        </button>
      </header>

      {/* Sticky Search + Filters */}
      <div className="sticky top-[72px] z-20 bg-background-dark flex flex-col gap-4 px-4 pt-2 pb-3">
        {/* Search */}
        <label className="flex h-12 w-full">
          <div className="flex w-full flex-1 items-stretch rounded-2xl bg-white/5 overflow-hidden">
            <div className="flex items-center justify-center pl-4 pr-2 text-white/40">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              className="flex-1 bg-transparent text-base font-medium placeholder:text-white/30 text-white focus:outline-none px-2"
              placeholder="Search songs, artists..."
            />
          </div>
        </label>

        {/* Genre Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 snap-x">
          {genres.map((genre, i) => (
            <button
              key={genre}
              className={`snap-start flex h-8 shrink-0 items-center justify-center rounded-full px-5 transition-colors ${
                i === 0
                  ? "bg-primary text-white font-bold shadow-lg"
                  : "bg-white/5 border border-white/5 text-white/60 font-bold hover:bg-white/10"
              }`}
            >
              <span className="text-xs uppercase tracking-wider">{genre}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Song List */}
      <div className="flex flex-col px-4 divide-y divide-white/5">
        {browseSongs.map((song) => (
          <div
            key={song.id}
            className="flex items-center gap-4 py-3 active:bg-white/5 transition-colors cursor-pointer group"
          >
            {/* Album Art */}
            <div className="relative size-12 shrink-0 rounded-full overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${song.albumArt}')` }}
              />
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">
                {song.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/50 truncate">
                  {song.artist}
                </span>
                <span className="size-1 rounded-full bg-white/20" />
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] font-bold text-primary">
                    {song.tokens}
                  </span>
                  <span
                    className="material-symbols-outlined text-[10px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    token
                  </span>
                </div>
              </div>
            </div>

            {/* Add Button */}
            <button className="size-10 flex items-center justify-center text-white/40 group-hover:text-primary active:scale-90 transition-all">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
          </div>
        ))}
      </div>

      <BottomNav active="browse" />
    </div>
  );
}
```

- [ ] **Step 2: Visit http://localhost:3000/browse — verify:**
  - Sticky header with back + filter icons
  - Search bar with white/5 background
  - Genre pills with "All" highlighted in primary pink
  - 10 song rows with circular album art, song name, artist, token count
  - Add circle icon on the right
  - Bottom nav visible with Browse active

- [ ] **Step 3: Commit**

```bash
git add app/browse/page.tsx
git commit -m "feat: add Browse Music page matching Stitch design"
```

---

## Task 7: Live Queue Page

**Files:**
- Create: `app/queue/page.tsx`

- [ ] **Step 1: Create `app/queue/page.tsx`**

```tsx
import Link from "next/link";
import BottomNav from "@/components/bottom-nav";
import { nowPlaying, queueSongs } from "@/lib/mock-data";

export default function QueuePage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-background-dark/90 backdrop-blur-md">
        <button className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">The Neon Lounge</h1>
        <button className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">settings</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col gap-6 px-4 pb-40">
        {/* Now Playing */}
        <section className="mt-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary animate-pulse">
                equalizer
              </span>
              Now Playing
            </h2>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/20 text-primary uppercase tracking-wider">
              LIVE
            </span>
          </div>

          {/* Vinyl Disc */}
          <div className="relative group w-full aspect-square max-w-[300px] mx-auto">
            {/* Glow */}
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
              style={{
                background:
                  "linear-gradient(to top right, #f20da6, #9333ea, #2563eb)",
              }}
            />
            {/* Disc */}
            <div className="relative w-full h-full rounded-full border-4 border-white/10 bg-black shadow-2xl flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 rounded-full opacity-20"
                style={{
                  background:
                    "repeating-radial-gradient(#111 0, #111 2px, #222 3px, #222 4px)",
                }}
              />
              {/* Spinning album art */}
              <div className="relative w-[65%] h-[65%] rounded-full overflow-hidden border-8 border-black shadow-lg animate-spin [animation-duration:10s]">
                <img
                  src={nowPlaying.albumArt}
                  alt={nowPlaying.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Center hole */}
              <div className="absolute w-4 h-4 bg-background-dark rounded-full z-10" />
            </div>
          </div>

          {/* Song info */}
          <div className="text-center mt-6 space-y-1">
            <h3 className="text-2xl font-bold">{nowPlaying.title}</h3>
            <p className="text-slate-400 text-lg">{nowPlaying.artist}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-1 w-full max-w-[120px] bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${nowPlaying.progress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400">
                {nowPlaying.currentTime} / {nowPlaying.totalTime}
              </span>
            </div>
          </div>
        </section>

        {/* Queue */}
        <section className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Up Next</h3>
            <span className="text-sm text-slate-400">
              {queueSongs.length} songs in queue
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {queueSongs.map((song) => (
              <div
                key={song.id}
                className="group flex items-center gap-3 p-3 rounded-lg bg-surface-dark border border-transparent hover:border-primary/50 transition-all duration-300 shadow-sm"
              >
                {/* Thumbnail */}
                <div className="relative shrink-0 size-14 rounded overflow-hidden">
                  <img
                    src={song.albumArt}
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-lg">
                      play_arrow
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold truncate">{song.title}</p>
                  <p className="text-sm text-slate-400 truncate">{song.artist}</p>
                </div>

                {/* Wait time + info */}
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs font-bold text-slate-500">
                    {song.waitMinutes} min
                  </span>
                  <button className="p-2 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      info
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* FAB */}
      <div className="fixed bottom-20 left-0 right-0 p-4 z-40 flex justify-center max-w-md mx-auto pointer-events-none">
        <Link
          href="/request"
          className="pointer-events-auto w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 text-white"
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
          }}
        >
          <span className="material-symbols-outlined">add_circle</span>
          Request a Song
        </Link>
      </div>

      <BottomNav active="queue" />
    </div>
  );
}
```

- [ ] **Step 2: Visit http://localhost:3000/queue — verify:**
  - "The Neon Lounge" header
  - "Now Playing" heading with pulsing equalizer + "LIVE" badge
  - Spinning vinyl disc with album art
  - Progress bar + time display
  - List of 8 queue songs with hover effects
  - Blue "Request a Song" FAB above the bottom nav
  - Bottom nav with Queue tab active

- [ ] **Step 3: Commit**

```bash
git add app/queue/page.tsx
git commit -m "feat: add Live Queue page matching Stitch design"
```

---

## Task 8: Request Song Page

**Files:**
- Create: `app/request/page.tsx`

- [ ] **Step 1: Create `app/request/page.tsx`**

```tsx
import BottomNav from "@/components/bottom-nav";
import { trendingSongs } from "@/lib/mock-data";

export default function RequestPage() {
  return (
    <div
      className="relative flex min-h-screen w-full flex-col bg-background-dark max-w-md mx-auto"
      style={{ background: "#23101d" }}
    >
      {/* Dark overlay backdrop (mimics bottom-sheet feel) */}
      <div className="flex flex-col flex-1">
        {/* Drag Handle */}
        <button className="flex h-7 w-full items-center justify-center mt-2">
          <div className="h-1 w-9 rounded-full bg-surface-dark" />
        </button>

        {/* Search */}
        <div className="px-4 py-3">
          <label className="flex h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-center pl-4 pr-2 text-surface-muted"
                style={{ background: "#392833" }}
              >
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                placeholder="Search for a song..."
                className="flex-1 text-white text-base placeholder:text-surface-muted px-2 focus:outline-none border-none"
                style={{ background: "#392833" }}
              />
            </div>
          </label>
        </div>

        {/* Trending Songs */}
        <h3 className="text-white text-lg font-bold px-4 pb-2 pt-4">
          Trending Songs
        </h3>

        <div className="flex flex-col pb-24">
          {trendingSongs.map((song) => (
            <div
              key={song.id}
              className="flex items-center justify-between px-4 py-2 min-h-[72px]"
              style={{ background: "#23101d" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="size-14 rounded-lg bg-cover bg-center shrink-0"
                  style={{ backgroundImage: `url('${song.albumArt}')` }}
                />
                <div className="flex flex-col">
                  <p className="text-white text-base font-medium line-clamp-1">
                    {song.title}
                  </p>
                  <p className="text-surface-muted text-sm line-clamp-1">
                    {song.artist}
                  </p>
                </div>
              </div>
              <button
                className="flex items-center justify-center h-8 px-4 rounded-full text-white text-sm font-medium shrink-0"
                style={{ background: "#49223c" }}
              >
                {song.tokens} Token
              </button>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="browse" />
    </div>
  );
}
```

- [ ] **Step 2: Visit http://localhost:3000/request — verify:**
  - Dark background `#23101d`
  - Drag handle at top
  - Search bar with darker bg
  - "Trending Songs" heading
  - 6 song rows: square album art + name + artist + token pill
  - Token pill has `#49223c` background

- [ ] **Step 3: Commit**

```bash
git add app/request/page.tsx
git commit -m "feat: add Request Song page matching Stitch design"
```

---

## Task 9: Fix next.config.ts for external images

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update `next.config.ts` to allow Unsplash image domain**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
```

> Note: The pages use `<img>` tags (not `next/image`), so this is precautionary. If any page is later upgraded to use `<Image>`, this config is already in place.

- [ ] **Step 2: Commit**

```bash
git add next.config.ts
git commit -m "chore: allow unsplash remote images in next.config"
```

---

## Self-Review

**Spec coverage:**
- ✅ Login page — hero, form, social buttons
- ✅ Browse page — search, genre pills, song list, bottom nav
- ✅ Queue page — vinyl animation, now playing, queue list, FAB, bottom nav
- ✅ Request page — drag handle, search, trending songs with token pills
- ✅ Shared BottomNav — all 4 nav items, active state
- ✅ Mock data — browseSongs, queueSongs, nowPlaying, trendingSongs
- ✅ Design tokens — primary, background-dark, surface-dark, surface-muted, Plus Jakarta Sans

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:** `Song`, `QueueSong` types defined in Task 2 and used correctly in Tasks 6–8. `NavItem` type in BottomNav matches usage in all page files.
