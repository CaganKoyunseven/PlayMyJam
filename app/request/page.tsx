'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import { searchTracks, SpotifyTrackResult } from '@/lib/spotify-api';
import { createSongRequest } from '@/lib/db';

const SESSION_KEY = 'pmj_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, id); }
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

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

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRequest(track: SpotifyTrackResult) {
    setLoadingId(track.spotifyTrackId);
    const sid = getSessionId();
    const result = await createSongRequest(track, sid);
    if (result.ok) {
      setRequestedIds((prev) => new Set(prev).add(track.spotifyTrackId));
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
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark pb-24 max-w-md mx-auto">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl border text-sm font-medium text-white shadow-xl ${
          toast.ok ? 'bg-surface-dark border-white/10' : 'bg-red-500/20 border-red-500/30'
        }`}>
          {toast.msg}
        </div>
      )}

      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-background-dark/95 backdrop-blur-md">
        <button onClick={() => router.back()} className="flex size-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex-1">
          <h2 className="text-base font-black leading-tight">Request a Song</h2>
          <p className="text-[11px] text-slate-400">Can't find it in the library? Request it — free!</p>
        </div>
      </header>

      {/* Search bar */}
      <div className="sticky top-[68px] z-20 px-4 pb-3 bg-background-dark">
        <div className="flex h-12 w-full items-stretch rounded-2xl bg-white/5 overflow-hidden">
          <div className="flex items-center justify-center pl-4 pr-2 text-white/40">
            {searching ? (
              <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">search</span>
            )}
          </div>
          <input
            className="flex-1 bg-transparent text-base font-medium placeholder:text-white/30 text-white focus:outline-none px-2"
            placeholder="Search any song on Spotify..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); }} className="flex items-center justify-center pr-4 text-white/40 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col px-4 divide-y divide-white/5">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="material-symbols-outlined text-white/20 text-5xl">library_music</span>
            <p className="text-white/40 text-sm font-medium">Search Spotify</p>
            <p className="text-white/20 text-xs">Type a song name or artist to get started</p>
          </div>
        ) : results.length === 0 && !searching ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="material-symbols-outlined text-white/20 text-5xl">music_off</span>
            <p className="text-white/40 text-sm font-medium">No results found</p>
          </div>
        ) : (
          results.map((track) => {
            const isRequested = requestedIds.has(track.spotifyTrackId);
            const isLoading = loadingId === track.spotifyTrackId;
            return (
              <div key={track.spotifyTrackId} className="flex items-center gap-4 py-3">
                <div className="relative size-12 shrink-0 rounded-full overflow-hidden">
                  {track.albumArt ? (
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${track.albumArt}')` }} />
                  ) : (
                    <div className="absolute inset-0 bg-surface-dark flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/20 text-lg">music_note</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{track.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-white/50 truncate">{track.artist}</span>
                    <span className="size-1 rounded-full bg-white/20 shrink-0" />
                    <span className="text-[10px] text-white/30 shrink-0">{formatDuration(track.durationMs)}</span>
                  </div>
                </div>

                <button
                  onClick={() => !isRequested && !isLoading && handleRequest(track)}
                  disabled={isRequested || isLoading}
                  className={`shrink-0 flex h-9 items-center gap-1.5 px-3 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-60 ${
                    isRequested
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-white'
                  }`}
                  style={!isRequested ? { background: 'linear-gradient(135deg, #f20da6, #9333ea)' } : {}}
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                  ) : isRequested ? (
                    <><span className="material-symbols-outlined text-[14px]">check</span> Sent</>
                  ) : (
                    <><span className="material-symbols-outlined text-[14px]">add</span> Request</>
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
