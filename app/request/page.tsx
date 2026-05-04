'use client';

import { useState, useEffect, useRef } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import BottomNav from '@/components/bottom-nav';
import { useAuth } from '@/lib/auth-context';
import { createSongRequest } from '@/lib/db';
import { searchTracks, SpotifyTrackResult } from '@/lib/spotify-api';

const SESSION_KEY = 'pmj_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function RequestPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchTracks(query);
        setResults(res);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRequest(track: SpotifyTrackResult) {
    if (!user) {
      showToast('You need to log in to request a song', false);
      return;
    }
    setLoadingId(track.spotifyTrackId);
    const sid = getSessionId();
    const result = await createSongRequest(track, sid);
    if (result.ok) {
      setRequestedIds(prev => new Set(prev).add(track.spotifyTrackId));
      showToast('Request sent! Admin will review it.');
    } else if (result.reason === 'already_requested') {
      showToast('Already requested or available in library.', false);
    } else {
      showToast('Something went wrong, try again.', false);
    }
    setLoadingId(null);
  }

  function formatDuration(ms: number) {
    const m = Math.floor(ms / 60000);
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${m}:${s}`;
  }

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden pb-24">
      {toast && (
        <div
          className={`fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium text-white shadow-xl ${
            toast.ok ? 'bg-surface-dark border-white/10' : 'border-red-500/30 bg-red-500/20'
          }`}
        >
          <span>{toast.msg}</span>
          {!toast.ok && !user && (
            <Link
              href="/login"
              className="text-primary font-bold whitespace-nowrap underline"
            >
              Log in
            </Link>
          )}
        </div>
      )}

      <header className="bg-background-dark/95 sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-colors active:bg-white/10"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex-1">
          <h2 className="text-base leading-tight font-black">Request a Song</h2>
          <p className="text-[11px] text-slate-400">Can&apos;t find it in the library? Request it — free!</p>
        </div>
      </header>

      {/* Search bar */}
      <div className="bg-background-dark sticky top-[68px] z-20 px-4 pb-3">
        <div className="flex h-12 w-full items-stretch overflow-hidden rounded-2xl bg-white/5">
          <div className="flex items-center justify-center pr-2 pl-4 text-white/40">
            {searching ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">search</span>
            )}
          </div>
          <input
            className="flex-1 bg-transparent px-2 text-base font-medium text-white placeholder:text-white/30 focus:outline-none"
            placeholder="Search any song on Spotify..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="flex items-center justify-center pr-4 text-white/40 transition-colors hover:text-white"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col divide-y divide-white/5 px-4">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <span className="material-symbols-outlined text-5xl text-white/20">library_music</span>
            <p className="text-sm font-medium text-white/40">Search Spotify</p>
            <p className="text-xs text-white/20">Type a song name or artist to get started</p>
          </div>
        ) : results.length === 0 && !searching ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <span className="material-symbols-outlined text-5xl text-white/20">music_off</span>
            <p className="text-sm font-medium text-white/40">No results found</p>
          </div>
        ) : (
          results.map(track => {
            const isRequested = requestedIds.has(track.spotifyTrackId);
            const isLoading = loadingId === track.spotifyTrackId;
            return (
              <div
                key={track.spotifyTrackId}
                className="flex items-center gap-4 py-3"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
                  {track.albumArt ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${track.albumArt}')` }}
                    />
                  ) : (
                    <div className="bg-surface-dark absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg text-white/20">music_note</span>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="truncate text-sm font-semibold text-white">{track.title}</h3>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-xs text-white/50">{track.artist}</span>
                    <span className="size-1 shrink-0 rounded-full bg-white/20" />
                    <span className="shrink-0 text-[10px] text-white/30">{formatDuration(track.durationMs)}</span>
                  </div>
                </div>

                <button
                  onClick={() => !isRequested && !isLoading && handleRequest(track)}
                  disabled={isRequested || isLoading}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all active:scale-95 disabled:opacity-60 ${
                    isRequested ? 'bg-green-500/20 text-green-400' : 'text-white'
                  }`}
                  style={!isRequested ? { background: 'linear-gradient(135deg, #f20da6, #9333ea)' } : {}}
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined animate-spin text-[14px]">refresh</span>
                  ) : isRequested ? (
                    <>
                      <span className="material-symbols-outlined text-[14px]">check</span> Sent
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[14px]">add</span> Request
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      <BottomNav active="browse" />
    </div>
  );
}
