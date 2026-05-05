'use client';

import { useState, useEffect, useCallback } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import BottomNav from '@/components/bottom-nav';
import { useAuth } from '@/lib/auth-context';
import { getVenueImportedPlaylists, getPlaylistSongs, insertQueueItem, getOrCreateTokenBalance, deductToken, PlaylistRow, QueueItem } from '@/lib/db';

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

export default function BrowsePage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [songs, setSongs] = useState<QueueItem[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [toast, setToast] = useState<{ msg: string; loginLink: boolean } | null>(null);
  const { user } = useAuth();

  const loadPlaylist = useCallback(async (playlistId: string) => {
    setActivePlaylist(playlistId);
    setLoadingSongs(true);
    const items = await getPlaylistSongs(playlistId);
    setSongs(items);
    setLoadingSongs(false);
  }, []);

  useEffect(() => {
    getVenueImportedPlaylists().then(pl => {
      setPlaylists(pl);
      if (pl.length > 0) loadPlaylist(pl[0].id);
    });
    const sid = getSessionId();
    getOrCreateTokenBalance(sid).then(setTokenBalance);
  }, [loadPlaylist]);

  function showToast(msg: string, loginLink = false) {
    setToast({ msg, loginLink: loginLink && !user });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAdd(song: QueueItem) {
    if (!user) {
      showToast('You need to log in to add songs to the queue', true);
      return;
    }
    const sid = getSessionId();
    const { ok, balance } = await deductToken(sid);
    if (!ok) {
      showToast('Not enough tokens — visit Tokens to top up');
      return;
    }
    setTokenBalance(balance);
    await insertQueueItem(song.songId, undefined, true);
    setAddedIds(prev => new Set(prev).add(song.songId));
    showToast('Added to queue!');
    router.push('/queue');
  }

  const filtered = songs.filter(song => {
    const matchesSearch = search === '' || song.title.toLowerCase().includes(search.toLowerCase()) || song.artist.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden pb-24">
      {/* Toast */}
      {toast && (
        <div className="bg-surface-dark fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white shadow-xl">
          <span>{toast.msg}</span>
          {toast.loginLink && (
            <Link
              href="/login"
              className="text-primary font-bold whitespace-nowrap underline"
            >
              Log in
            </Link>
          )}
        </div>
      )}

      <header className="bg-background-dark/95 sticky top-0 z-30 flex items-center justify-between p-4 backdrop-blur-md">
        <button className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-colors active:bg-white/10">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="flex-1 text-center text-lg leading-tight font-bold">Browse Library</h2>
        {/* Token balance */}
        <div className="bg-primary/20 flex items-center gap-1 rounded-full px-3 py-1">
          <span
            className="material-symbols-outlined text-primary text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            token
          </span>
          <span className="text-primary text-xs font-bold">{tokenBalance ?? '…'}</span>
        </div>
      </header>

      <div className="bg-background-dark sticky top-[72px] z-20 flex flex-col gap-3 px-4 pt-2 pb-3">
        {/* Search */}
        <div className="flex h-12 w-full">
          <div className="flex w-full flex-1 items-stretch overflow-hidden rounded-2xl bg-white/5">
            <div className="flex items-center justify-center pr-2 pl-4 text-white/40">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              className="flex-1 bg-transparent px-2 text-base font-medium text-white placeholder:text-white/30 focus:outline-none"
              placeholder="Search songs, artists..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="flex items-center justify-center pr-4 text-white/40 transition-colors hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Playlist pills */}
        {playlists.length > 0 && (
          <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
            {playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => loadPlaylist(pl.id)}
                className={`flex h-8 shrink-0 snap-start items-center justify-center rounded-full px-4 transition-colors ${
                  activePlaylist === pl.id
                    ? 'bg-primary shadow-primary/25 font-bold text-white shadow-lg'
                    : 'border border-white/5 bg-white/5 font-bold text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="max-w-[120px] truncate text-xs">{pl.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Song List */}
      <div className="flex flex-col divide-y divide-white/5 px-4">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-white/20">library_music</span>
            <p className="text-sm font-medium text-white/40">No playlists imported yet</p>
            <p className="text-xs text-white/20">Connect Spotify and import a playlist first</p>
          </div>
        ) : loadingSongs ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-5xl text-white/20">refresh</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-white/20">music_off</span>
            <p className="text-sm font-medium text-white/40">No songs found</p>
          </div>
        ) : (
          filtered.map(song => {
            const isAdded = addedIds.has(song.songId);
            const mins = Math.floor(song.durationMs / 60000);
            const secs = String(Math.floor((song.durationMs % 60000) / 1000)).padStart(2, '0');
            return (
              <div
                key={song.songId}
                className="group flex cursor-pointer items-center gap-4 py-3 transition-colors active:bg-white/5"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
                  {song.albumArt ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${song.albumArt}')` }}
                    />
                  ) : (
                    <div className="bg-surface-dark absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg text-white/20">music_note</span>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="truncate text-sm font-semibold text-white">{song.title}</h3>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-xs text-white/50">{song.artist}</span>
                    <span className="size-1 shrink-0 rounded-full bg-white/20" />
                    <span className="shrink-0 text-[10px] text-white/30">
                      {mins}:{secs}
                    </span>
                    <span className="size-1 shrink-0 rounded-full bg-white/20" />
                    <div className="flex shrink-0 items-center gap-0.5">
                      <span className="text-primary text-[10px] font-bold">1</span>
                      <span
                        className="material-symbols-outlined text-primary text-[10px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        token
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => !isAdded && handleAdd(song)}
                  className={`flex size-10 items-center justify-center transition-all active:scale-90 ${
                    isAdded ? 'text-green-400' : 'group-hover:text-primary text-white/40'
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={isAdded ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {isAdded ? 'check_circle' : 'add_circle'}
                  </span>
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
