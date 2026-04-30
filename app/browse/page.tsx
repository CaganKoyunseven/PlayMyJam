'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import { getVenueImportedPlaylists, getPlaylistSongs, insertQueueItem, insertSongRequest, getOrCreateTokenBalance, deductToken, PlaylistRow, QueueItem } from '@/lib/db';

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
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    getVenueImportedPlaylists().then((pl) => {
      setPlaylists(pl);
      if (pl.length > 0) loadPlaylist(pl[0].id);
    });
    const sid = getSessionId();
    getOrCreateTokenBalance(sid).then(setTokenBalance);
  }, []);

  async function loadPlaylist(playlistId: string) {
    setActivePlaylist(playlistId);
    setLoadingSongs(true);
    const items = await getPlaylistSongs(playlistId);
    setSongs(items);
    setLoadingSongs(false);
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }

  async function handleAdd(song: QueueItem) {
    const sid = getSessionId();
    const { ok, balance } = await deductToken(sid);
    if (!ok) {
      showToast('Not enough tokens — visit Tokens to top up');
      return;
    }
    setTokenBalance(balance);
    await insertQueueItem(song.songId);
    await insertSongRequest(song.songId, sid);
    setAddedIds((prev) => new Set(prev).add(song.songId));
    showToast('Added to queue!');
    router.push('/queue');
  }

  const filtered = songs.filter((song) => {
    const matchesSearch =
      search === '' ||
      song.title.toLowerCase().includes(search.toLowerCase()) ||
      song.artist.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark pb-24 max-w-md mx-auto">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-surface-dark border border-white/10 text-sm font-medium text-white shadow-xl">
          {toastMsg}
        </div>
      )}

      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background-dark/95 backdrop-blur-md">
        <button className="flex size-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center">Browse Library</h2>
        {/* Token balance */}
        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20">
          <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>token</span>
          <span className="text-xs font-bold text-primary">{tokenBalance ?? '…'}</span>
        </div>
      </header>

      <div className="sticky top-[72px] z-20 bg-background-dark flex flex-col gap-3 px-4 pt-2 pb-3">
        {/* Search */}
        <div className="flex h-12 w-full">
          <div className="flex w-full flex-1 items-stretch rounded-2xl bg-white/5 overflow-hidden">
            <div className="flex items-center justify-center pl-4 pr-2 text-white/40">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              className="flex-1 bg-transparent text-base font-medium placeholder:text-white/30 text-white focus:outline-none px-2"
              placeholder="Search songs, artists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="flex items-center justify-center pr-4 text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Playlist pills */}
        {playlists.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 snap-x">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => loadPlaylist(pl.id)}
                className={`snap-start flex h-8 shrink-0 items-center justify-center rounded-full px-4 transition-colors ${
                  activePlaylist === pl.id
                    ? 'bg-primary text-white font-bold shadow-lg shadow-primary/25'
                    : 'bg-white/5 border border-white/5 text-white/60 font-bold hover:bg-white/10'
                }`}
              >
                <span className="text-xs truncate max-w-[120px]">{pl.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Song List */}
      <div className="flex flex-col px-4 divide-y divide-white/5">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="material-symbols-outlined text-white/20 text-5xl">library_music</span>
            <p className="text-white/40 text-sm font-medium">No playlists imported yet</p>
            <p className="text-white/20 text-xs">Connect Spotify and import a playlist first</p>
          </div>
        ) : loadingSongs ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined text-white/20 text-5xl animate-spin">refresh</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="material-symbols-outlined text-white/20 text-5xl">music_off</span>
            <p className="text-white/40 text-sm font-medium">No songs found</p>
          </div>
        ) : (
          filtered.map((song) => {
            const isAdded = addedIds.has(song.songId);
            const mins = Math.floor(song.durationMs / 60000);
            const secs = String(Math.floor((song.durationMs % 60000) / 1000)).padStart(2, '0');
            return (
              <div key={song.songId} className="flex items-center gap-4 py-3 active:bg-white/5 transition-colors cursor-pointer group">
                <div className="relative size-12 shrink-0 rounded-full overflow-hidden">
                  {song.albumArt ? (
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${song.albumArt}')` }} />
                  ) : (
                    <div className="absolute inset-0 bg-surface-dark flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/20 text-lg">music_note</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{song.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-white/50 truncate">{song.artist}</span>
                    <span className="size-1 rounded-full bg-white/20 shrink-0" />
                    <span className="text-[10px] text-white/30 shrink-0">{mins}:{secs}</span>
                    <span className="size-1 rounded-full bg-white/20 shrink-0" />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="text-[10px] font-bold text-primary">1</span>
                      <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>token</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => !isAdded && handleAdd(song)}
                  className={`size-10 flex items-center justify-center active:scale-90 transition-all ${
                    isAdded ? 'text-green-400' : 'text-white/40 group-hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined" style={isAdded ? { fontVariationSettings: "'FILL' 1" } : {}}>
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
