'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import {
  getPendingRequests,
  getQueueItems,
  approveRequest,
  rejectRequest,
  removeQueueItem,
  setNowPlaying,
  updateQueueItemPosition,
  getVenueImportedPlaylists,
  SongRequest,
  QueueItem,
  PlaylistRow,
} from '@/lib/db';
import { initObservers, teardownObservers } from '@/lib/observers';
import { DEFAULT_VENUE_ID } from '@/lib/constants';
import { getVenueToken } from '@/lib/spotify-auth';
import { getVenuePlaylists, importPlaylist, checkSpotifyConnection, SpotifyPlaylist } from '@/lib/spotify-api';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

type Tab = 'requests' | 'queue' | 'spotify' | 'qr';

export default function AdminDashboard() {
  const router = useRouter();

  // ── Queue / Requests state ─────────────────────────────────
  const [requests, setRequests]       = useState<SongRequest[]>([]);
  const [queue, setQueue]             = useState<QueueItem[]>([]);
  const [nowPlaying, setNowPlayingItem] = useState<QueueItem | null>(null);
  const [acting, setActing]           = useState<string | null>(null);
  const [tab, setTab]                 = useState<Tab>('requests');

  // ── Spotify state ──────────────────────────────────────────
  const [spotifyConnected, setSpotifyConnected]       = useState<boolean | null>(null);
  const [spotifyPlaylists, setSpotifyPlaylists]       = useState<SpotifyPlaylist[]>([]);
  const [importedPlaylists, setImportedPlaylists]     = useState<PlaylistRow[]>([]);
  const [importing, setImporting]                     = useState<string | null>(null);
  const [loadingPlaylists, setLoadingPlaylists]       = useState(false);
  const [spotifyError, setSpotifyError]               = useState<string | null>(null);
  const [spotifyToast, setSpotifyToast]               = useState<string | null>(null);

  // ── Init ───────────────────────────────────────────────────
  useEffect(() => {
    initObservers();
    load();
    loadSpotifySetup();

    const reqChannel = supabase
      .channel('admin_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests', filter: `venue_id=eq.${DEFAULT_VENUE_ID}` }, load)
      .subscribe();

    const queueChannel = supabase
      .channel('admin_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_items', filter: `venue_id=eq.${DEFAULT_VENUE_ID}` }, loadQueue)
      .subscribe();

    return () => {
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(queueChannel);
      teardownObservers();
    };
  }, []);

  // ── Queue loaders ──────────────────────────────────────────
  const load = useCallback(async () => {
    const [reqs, items] = await Promise.all([getPendingRequests(), getQueueItems()]);
    setRequests(reqs);
    setQueue(items.filter((i) => !i.isPlaying));
    setNowPlayingItem(items.find((i) => i.isPlaying) ?? null);
  }, []);

  const loadQueue = useCallback(async () => {
    const items = await getQueueItems();
    setQueue(items.filter((i) => !i.isPlaying));
    setNowPlayingItem(items.find((i) => i.isPlaying) ?? null);
  }, []);

  // ── Spotify loaders ────────────────────────────────────────
  async function loadSpotifySetup() {
    const [{ connected }, imported] = await Promise.all([
      checkSpotifyConnection(),
      getVenueImportedPlaylists(),
    ]);
    setSpotifyConnected(connected);
    setImportedPlaylists(imported);
    if (connected) {
      const token = await getVenueToken().catch(() => null);
      if (token) fetchSpotifyPlaylists();
    }
  }

  async function fetchSpotifyPlaylists() {
    setLoadingPlaylists(true);
    setSpotifyError(null);
    try {
      setSpotifyPlaylists(await getVenuePlaylists());
    } catch (e) {
      setSpotifyError((e as Error).message);
    }
    setLoadingPlaylists(false);
  }

  async function handleImport(pl: SpotifyPlaylist) {
    setImporting(pl.id);
    setSpotifyError(null);
    try {
      const { imported } = await importPlaylist(pl.id);
      setSpotifyToast(`Imported "${pl.name}" — ${imported} songs`);
      setTimeout(() => setSpotifyToast(null), 3000);
      setImportedPlaylists(await getVenueImportedPlaylists());
    } catch (e) {
      setSpotifyError((e as Error).message);
    }
    setImporting(null);
  }

  // ── Queue handlers ─────────────────────────────────────────
  async function handleApprove(req: SongRequest) {
    setActing(req.id);
    await approveRequest(req.id, req.songId, req.sessionId);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setActing(null);
  }


  async function handleMoveUp(item: QueueItem, index: number) {
    if (index === 0) return;
    const above = queue[index - 1];
    setActing(item.id + '_move');
    await Promise.all([
      updateQueueItemPosition(item.id, above.position),
      updateQueueItemPosition(above.id, item.position),
    ]);
    await loadQueue();
    setActing(null);
  }

  async function handleMoveDown(item: QueueItem, index: number) {
    if (index === queue.length - 1) return;
    const below = queue[index + 1];
    setActing(item.id + '_move');
    await Promise.all([
      updateQueueItemPosition(item.id, below.position),
      updateQueueItemPosition(below.id, item.position),
    ]);
    await loadQueue();
    setActing(null);
  }

  async function handleReject(req: SongRequest) {
    setActing(req.id);
    await rejectRequest(req.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setActing(null);
  }

  async function handleSetNowPlaying(item: QueueItem) {
    setActing(item.id);
    await setNowPlaying(item.id);
    await loadQueue();
    setActing(null);
  }

  async function handleRemove(item: QueueItem) {
    setActing(item.id);
    await removeQueueItem(item.id);
    setQueue((prev) => prev.filter((q) => q.id !== item.id));
    setActing(null);
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin');
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background-dark max-w-md mx-auto">
      {/* Spotify import toast */}
      {spotifyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-surface-dark border border-white/10 text-sm font-medium text-white shadow-xl">
          {spotifyToast}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background-dark/95 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[18px]">admin_panel_settings</span>
          </div>
          <h1 className="text-base font-black">Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">The Neon Lounge</span>
          <button onClick={handleLogout} className="flex size-8 items-center justify-center rounded-full text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      {/* Now Playing bar */}
      {nowPlaying && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-primary/10 border border-primary/30 px-4 py-3">
          <span className="material-symbols-outlined text-primary text-[20px] animate-pulse">equalizer</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-bold uppercase tracking-wider">Now Playing</p>
            <p className="text-sm font-semibold truncate">{nowPlaying.title}</p>
            <p className="text-xs text-slate-400 truncate">{nowPlaying.artist}</p>
          </div>
          {nowPlaying.albumArt && (
            <img src={nowPlaying.albumArt} alt="" className="size-10 rounded-lg object-cover shrink-0" />
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 bg-white/5 rounded-xl p-1">
        {([
          { key: 'requests', label: 'Requests', badge: requests.length },
          { key: 'queue',    label: 'Queue',    badge: queue.length },
          { key: 'spotify',  label: 'Spotify',  badge: 0 },
          { key: 'qr',       label: 'QR',       badge: 0 },
        ] as { key: Tab; label: string; badge: number }[]).map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === key ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'
            }`}
          >
            {label}
            {badge > 0 && (
              <span className={`size-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                tab === key ? 'bg-white/20' : 'bg-primary text-white'
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col gap-3 px-4 pt-4 pb-10">

        {/* ── Pending Requests ── */}
        {tab === 'requests' && (
          requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <span className="material-symbols-outlined text-white/20 text-5xl">inbox</span>
              <p className="text-white/40 text-sm font-medium">No pending requests</p>
            </div>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 bg-surface-dark rounded-2xl border border-white/5 p-3">
                <div className="relative size-12 shrink-0 rounded-xl overflow-hidden">
                  {req.albumArt ? (
                    <img src={req.albumArt} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/20">music_note</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{req.title}</p>
                  <p className="text-xs text-slate-400 truncate">{req.artist}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{timeAgo(req.requestedAt)}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={acting === req.id}
                    className="flex h-8 w-24 items-center justify-center gap-1 rounded-xl bg-green-500/20 text-green-400 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                  >
                    {acting === req.id
                      ? <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                      : <><span className="material-symbols-outlined text-[14px]">check</span> Approve</>}
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={acting === req.id}
                    className="flex h-8 w-24 items-center justify-center gap-1 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span> Reject
                  </button>
                </div>
              </div>
            ))
          )
        )}

        {/* ── Queue ── */}
        {tab === 'queue' && (
          queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <span className="material-symbols-outlined text-white/20 text-5xl">queue_music</span>
              <p className="text-white/40 text-sm font-medium">Queue is empty</p>
              <p className="text-white/20 text-xs">Approve requests to add songs</p>
            </div>
          ) : (
            queue.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 bg-surface-dark rounded-2xl border border-white/5 p-3">
                <div className={`shrink-0 size-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                  index === 0 ? 'bg-primary text-white' : 'bg-white/10 text-white/40'
                }`}>
                  {index + 1}
                </div>
                <div className="relative size-12 shrink-0 rounded-xl overflow-hidden">
                  {item.albumArt ? (
                    <img src={item.albumArt} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/20">music_note</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.title}</p>
                  <p className="text-xs text-slate-400 truncate">{item.artist}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveUp(item, index)}
                      disabled={index === 0 || acting === item.id + '_move'}
                      title="Move up"
                      className="flex size-4 items-center justify-center rounded text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_drop_up</span>
                    </button>
                    <button
                      onClick={() => handleMoveDown(item, index)}
                      disabled={index === queue.length - 1 || acting === item.id + '_move'}
                      title="Move down"
                      className="flex size-4 items-center justify-center rounded text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                    </button>
                  </div>
                  <button
                    onClick={() => handleSetNowPlaying(item)}
                    disabled={acting === item.id}
                    title="Set as now playing"
                    className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-primary active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                  </button>
                  <button
                    onClick={() => handleRemove(item)}
                    disabled={acting === item.id}
                    title="Remove from queue"
                    className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )
        )}

        {/* ── Spotify ── */}
        {tab === 'spotify' && (
          <div className="flex flex-col gap-5">
            {/* Connection status */}
            <div className="bg-surface-dark rounded-2xl border border-white/5 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#1DB954]">music_note</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">Spotify</p>
                    <p className="text-xs text-slate-400">
                      {spotifyConnected === null ? 'Checking…' : spotifyConnected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className={`size-2.5 rounded-full ${
                  spotifyConnected === null ? 'bg-yellow-400' : spotifyConnected ? 'bg-green-400' : 'bg-red-400'
                }`} />
              </div>

              {spotifyPlaylists.length === 0 ? (
                <a
                  href="/api/spotify/connect"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
                  style={{ background: '#1DB954' }}
                >
                  <span className="material-symbols-outlined text-[18px]">link</span>
                  Connect Spotify Account
                </a>
              ) : (
                <button
                  onClick={fetchSpotifyPlaylists}
                  disabled={loadingPlaylists}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl font-bold text-sm text-white border border-[#1DB954]/40 hover:bg-[#1DB954]/10 transition-all disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[18px] text-[#1DB954] ${loadingPlaylists ? 'animate-spin' : ''}`}>refresh</span>
                  Refresh Playlists
                </button>
              )}

              {spotifyError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {spotifyError}
                </div>
              )}
            </div>

            {/* Spotify playlists to import */}
            {spotifyPlaylists.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-3 text-slate-400 uppercase tracking-wider">Your Spotify Playlists</h3>
                <div className="flex flex-col gap-2">
                  {spotifyPlaylists.map((pl) => {
                    const alreadyImported = importedPlaylists.some((ip) => ip.spotifyPlaylistId === pl.id);
                    return (
                      <div key={pl.id} className="flex items-center gap-3 bg-surface-dark rounded-xl border border-white/5 p-3">
                        <div
                          className="size-12 rounded-lg shrink-0 bg-cover bg-center bg-white/5"
                          style={pl.imageUrl ? { backgroundImage: `url('${pl.imageUrl}')` } : {}}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{pl.name}</p>
                          <p className="text-xs text-slate-400">{pl.trackCount} songs</p>
                        </div>
                        <button
                          onClick={() => !alreadyImported && handleImport(pl)}
                          disabled={importing === pl.id || alreadyImported}
                          className={`shrink-0 flex h-8 items-center gap-1 px-3 rounded-full text-xs font-bold transition-all active:scale-95 ${
                            alreadyImported ? 'bg-green-500/20 text-green-400' : 'text-white'
                          }`}
                          style={!alreadyImported ? { background: 'linear-gradient(135deg, #f20da6, #9333ea)' } : {}}
                        >
                          {importing === pl.id
                            ? <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                            : alreadyImported
                            ? <><span className="material-symbols-outlined text-[14px]">check</span> Imported</>
                            : <><span className="material-symbols-outlined text-[14px]">download</span> Import</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Already imported playlists */}
            {importedPlaylists.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-3 text-slate-400 uppercase tracking-wider">Imported Playlists</h3>
                <div className="flex flex-col gap-2">
                  {importedPlaylists.map((pl) => (
                    <div key={pl.id} className="flex items-center gap-3 bg-surface-dark rounded-xl border border-white/5 p-3">
                      <div
                        className="size-12 rounded-lg shrink-0 bg-cover bg-center bg-white/5"
                        style={pl.imageUrl ? { backgroundImage: `url('${pl.imageUrl}')` } : {}}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{pl.name}</p>
                        <p className="text-xs text-slate-400">{pl.trackCount} songs</p>
                      </div>
                      <span className="material-symbols-outlined text-green-400 text-[20px]">check_circle</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!spotifyConnected && importedPlaylists.length === 0 && spotifyPlaylists.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <span className="material-symbols-outlined text-white/20 text-5xl">library_music</span>
                <p className="text-white/40 text-sm font-medium">No playlists yet</p>
                <p className="text-white/20 text-xs">Connect Spotify above to import playlists</p>
              </div>
            )}
          </div>
        )}

        {/* ── QR Code ── */}
        {tab === 'qr' && (
          <div className="flex flex-col items-center gap-6 py-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h3 className="text-base font-bold">Venue QR Code</h3>
              <p className="text-xs text-slate-400 max-w-[240px]">
                Customers scan this to see the live queue and request songs.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-2xl">
              <QRCodeSVG
                value={typeof window !== 'undefined' ? `${window.location.origin}/queue` : '/queue'}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>

            <div className="bg-surface-dark rounded-xl border border-white/5 px-4 py-3 flex items-center gap-3 w-full">
              <span className="material-symbols-outlined text-white/30 text-[18px]">link</span>
              <span className="text-xs text-white/50 font-mono flex-1 truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/queue` : '/queue'}
              </span>
            </div>

            <p className="text-[10px] text-white/20 text-center">
              Post this QR code at your venue for guests to scan.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
