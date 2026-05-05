'use client';

import { useEffect, useState, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { QRCodeSVG } from 'qrcode.react';

import VirtualPlayer from '@/components/virtual-player';
import { DEFAULT_VENUE_ID } from '@/lib/constants';
import {
  getPendingRequests,
  getQueueItems,
  approveRequest,
  rejectRequest,
  removeQueueItem,
  setNowPlaying,
  updateQueueItemPosition,
  getVenueImportedPlaylists,
  getActivePlaylistId,
  removeImportedPlaylist,
  SongRequest,
  QueueItem,
  PlaylistRow,
} from '@/lib/db';
import { initObservers, teardownObservers } from '@/lib/observers';
import { getVenuePlaylists, checkSpotifyConnection, SpotifyPlaylist } from '@/lib/spotify-api';
import { getVenueToken } from '@/lib/spotify-auth';
import { supabase } from '@/lib/supabase';

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
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [nowPlaying, setNowPlayingItem] = useState<QueueItem | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('requests');

  // ── Spotify state ──────────────────────────────────────────
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [importedPlaylists, setImportedPlaylists] = useState<PlaylistRow[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyToast, setSpotifyToast] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // ── Queue loaders ──────────────────────────────────────────
  const load = useCallback(async () => {
    const [reqs, items] = await Promise.all([getPendingRequests(), getQueueItems()]);
    setRequests(reqs);
    setQueue(items.filter(i => !i.isPlaying));
    setNowPlayingItem(items.find(i => i.isPlaying) ?? null);
  }, []);

  const loadQueue = useCallback(async () => {
    const items = await getQueueItems();
    setQueue(items.filter(i => !i.isPlaying));
    setNowPlayingItem(items.find(i => i.isPlaying) ?? null);
  }, []);

  // ── Spotify loaders ────────────────────────────────────────
  const fetchSpotifyPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    setSpotifyError(null);
    try {
      setSpotifyPlaylists(await getVenuePlaylists());
    } catch (e) {
      setSpotifyError((e as Error).message);
    }
    setLoadingPlaylists(false);
  }, []);

  const loadSpotifySetup = useCallback(async () => {
    const [{ connected }, imported, activePl] = await Promise.all([checkSpotifyConnection(), getVenueImportedPlaylists(), getActivePlaylistId()]);
    setSpotifyConnected(connected);
    setImportedPlaylists(imported);
    setActivePlaylistId(activePl);
    if (connected) {
      const token = await getVenueToken().catch(() => null);
      if (token) fetchSpotifyPlaylists();
    }
  }, [fetchSpotifyPlaylists]);

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
  }, [load, loadQueue, loadSpotifySetup]);

  async function handleDisconnect() {
    setDisconnecting(true);
    setSpotifyError(null);
    try {
      const res = await fetch('/api/spotify/disconnect', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Disconnect failed');
      }
      setSpotifyConnected(false);
      setSpotifyPlaylists([]);
      setSpotifyToast('Spotify disconnected — click "Connect" to re-authorize with fresh permissions.');
      setTimeout(() => setSpotifyToast(null), 5000);
    } catch (e) {
      setSpotifyError((e as Error).message);
    }
    setDisconnecting(false);
  }

  async function handleImport(pl: SpotifyPlaylist) {
    setImporting(pl.id);
    setSpotifyError(null);
    try {
      const res = await fetch('/api/spotify/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: pl.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.hint ? `${data.error}\n💡 ${data.hint}` : (data.error ?? 'Import failed');
        throw new Error(errorMsg);
      }
      setSpotifyToast(`Imported "${pl.name}" — ${data.imported} songs`);
      setTimeout(() => setSpotifyToast(null), 3000);
      const [refreshed, activePl] = await Promise.all([getVenueImportedPlaylists(), getActivePlaylistId()]);
      setImportedPlaylists(refreshed);
      setActivePlaylistId(activePl);
    } catch (e) {
      setSpotifyError((e as Error).message);
    }
    setImporting(null);
  }

  async function handleRemovePlaylist(pl: PlaylistRow) {
    setRemoving(pl.id);
    setSpotifyError(null);
    try {
      await removeImportedPlaylist(pl.id);
      setSpotifyToast(`Removed "${pl.name}"`);
      setTimeout(() => setSpotifyToast(null), 3000);
      const [refreshed, activePl] = await Promise.all([getVenueImportedPlaylists(), getActivePlaylistId()]);
      setImportedPlaylists(refreshed);
      setActivePlaylistId(activePl);
    } catch (e) {
      setSpotifyError((e as Error).message);
    }
    setRemoving(null);
  }

  // ── Queue handlers ─────────────────────────────────────────
  async function handleApprove(req: SongRequest) {
    setActing(req.id);
    await approveRequest(req.id, req.songId, req.sessionId);
    setRequests(prev => prev.filter(r => r.id !== req.id));
    setActing(null);
  }

  async function handleMoveUp(item: QueueItem, index: number) {
    if (index === 0) return;
    const above = queue[index - 1];
    setActing(item.id + '_move');
    await Promise.all([updateQueueItemPosition(item.id, above.position), updateQueueItemPosition(above.id, item.position)]);
    await loadQueue();
    setActing(null);
  }

  async function handleMoveDown(item: QueueItem, index: number) {
    if (index === queue.length - 1) return;
    const below = queue[index + 1];
    setActing(item.id + '_move');
    await Promise.all([updateQueueItemPosition(item.id, below.position), updateQueueItemPosition(below.id, item.position)]);
    await loadQueue();
    setActing(null);
  }

  async function handleReject(req: SongRequest) {
    setActing(req.id);
    await rejectRequest(req.id);
    setRequests(prev => prev.filter(r => r.id !== req.id));
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
    setQueue(prev => prev.filter(q => q.id !== item.id));
    setActing(null);
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin');
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="bg-background-dark mx-auto flex min-h-screen max-w-md flex-col">
      {/* Spotify import toast */}
      {spotifyToast && (
        <div className="bg-surface-dark fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white shadow-xl">
          {spotifyToast}
        </div>
      )}

      {/* Header */}
      <header className="bg-background-dark/95 sticky top-0 z-30 flex items-center justify-between border-b border-white/5 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 flex size-8 items-center justify-center rounded-lg">
            <span className="material-symbols-outlined text-primary text-[18px]">admin_panel_settings</span>
          </div>
          <h1 className="text-base font-black">Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">The Neon Lounge</span>
          <button
            onClick={() => window.location.reload()}
            className="flex size-8 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white"
            title="Refresh Dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex size-8 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      {/* Now Playing bar — uses started_at virtual progress + auto-advance */}
      {nowPlaying && (
        <div className="bg-primary/10 border-primary/30 mx-4 mt-4 rounded-2xl border px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary animate-pulse text-[20px]">equalizer</span>
            <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-bold tracking-wider uppercase">Now Playing</p>
              <p className="truncate text-sm font-semibold">{nowPlaying.title}</p>
              <p className="truncate text-xs text-slate-400">{nowPlaying.artist}</p>
            </div>
            {nowPlaying.albumArt && (
              <img
                src={nowPlaying.albumArt}
                alt=""
                className="size-10 shrink-0 rounded-lg object-cover"
              />
            )}
          </div>
          <div className="mt-3">
            <VirtualPlayer
              nowPlaying={nowPlaying}
              compact
              autoAdvance
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-4 mt-4 flex gap-1 rounded-xl bg-white/5 p-1">
        {(
          [
            { key: 'requests', label: 'Requests', badge: requests.length },
            { key: 'queue', label: 'Queue', badge: queue.length },
            { key: 'spotify', label: 'Spotify', badge: 0 },
            { key: 'qr', label: 'QR', badge: 0 },
          ] as { key: Tab; label: string; badge: number }[]
        ).map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === key ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'
            }`}
          >
            {label}
            {badge > 0 && (
              <span
                className={`flex size-4 items-center justify-center rounded-full text-[10px] font-black ${
                  tab === key ? 'bg-white/20' : 'bg-primary text-white'
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-10">
        {/* ── Pending Requests ── */}
        {tab === 'requests' &&
          (requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-white/20">inbox</span>
              <p className="text-sm font-medium text-white/40">No pending requests</p>
            </div>
          ) : (
            requests.map(req => (
              <div
                key={req.id}
                className="bg-surface-dark flex items-center gap-3 rounded-2xl border border-white/5 p-3"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                  {req.albumArt ? (
                    <img
                      src={req.albumArt}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/5">
                      <span className="material-symbols-outlined text-white/20">music_note</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{req.title}</p>
                  <p className="truncate text-xs text-slate-400">{req.artist}</p>
                  <p className="mt-0.5 text-[10px] text-white/30">{timeAgo(req.requestedAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={acting === req.id}
                    className="flex h-8 w-24 items-center justify-center gap-1 rounded-xl bg-green-500/20 text-xs font-bold text-green-400 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {acting === req.id ? (
                      <span className="material-symbols-outlined animate-spin text-[14px]">refresh</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[14px]">check</span> Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={acting === req.id}
                    className="flex h-8 w-24 items-center justify-center gap-1 rounded-xl bg-red-500/20 text-xs font-bold text-red-400 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span> Reject
                  </button>
                </div>
              </div>
            ))
          ))}

        {/* ── Queue ── */}
        {tab === 'queue' &&
          (queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-white/20">queue_music</span>
              <p className="text-sm font-medium text-white/40">Queue is empty</p>
              <p className="text-xs text-white/20">Approve requests to add songs</p>
            </div>
          ) : (
            queue.map((item, index) => (
              <div
                key={item.id}
                className="bg-surface-dark flex items-center gap-3 rounded-2xl border border-white/5 p-3"
              >
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                    index === 0 ? 'bg-primary text-white' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                  {item.albumArt ? (
                    <img
                      src={item.albumArt}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/5">
                      <span className="material-symbols-outlined text-white/20">music_note</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.title}</p>
                  <p className="truncate text-xs text-slate-400">{item.artist}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveUp(item, index)}
                      disabled={index === 0 || acting === item.id + '_move'}
                      title="Move up"
                      className="flex size-4 items-center justify-center rounded text-white/30 transition-colors hover:text-white disabled:opacity-20"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_drop_up</span>
                    </button>
                    <button
                      onClick={() => handleMoveDown(item, index)}
                      disabled={index === queue.length - 1 || acting === item.id + '_move'}
                      title="Move down"
                      className="flex size-4 items-center justify-center rounded text-white/30 transition-colors hover:text-white disabled:opacity-20"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                    </button>
                  </div>
                  <button
                    onClick={() => handleSetNowPlaying(item)}
                    disabled={acting === item.id}
                    title="Set as now playing"
                    className="bg-primary/20 text-primary flex size-9 items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_circle
                    </span>
                  </button>
                  <button
                    onClick={() => handleRemove(item)}
                    disabled={acting === item.id}
                    title="Remove from queue"
                    className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-white/40 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          ))}

        {/* ── Spotify ── */}
        {tab === 'spotify' && (
          <div className="flex flex-col gap-5">
            {/* Connection status */}
            <div className="bg-surface-dark flex flex-col gap-4 rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#1DB954]/20">
                    <span className="material-symbols-outlined text-[#1DB954]">music_note</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Spotify</p>
                    <p className="text-xs text-slate-400">{spotifyConnected === null ? 'Checking…' : spotifyConnected ? 'Connected' : 'Not connected'}</p>
                  </div>
                </div>
                <div className={`size-2.5 rounded-full ${spotifyConnected === null ? 'bg-yellow-400' : spotifyConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>

              {!spotifyConnected ? (
                <a
                  href="/api/spotify/connect"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: '#1DB954' }}
                >
                  <span className="material-symbols-outlined text-[18px]">link</span>
                  Connect Spotify Account
                </a>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={fetchSpotifyPlaylists}
                      disabled={loadingPlaylists}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#1DB954]/40 text-sm font-bold text-white transition-all hover:bg-[#1DB954]/10 disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[18px] text-[#1DB954] ${loadingPlaylists ? 'animate-spin' : ''}`}>refresh</span>
                      Refresh
                    </button>
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 text-sm font-bold text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${disconnecting ? 'animate-spin' : ''}`}>
                        {disconnecting ? 'refresh' : 'link_off'}
                      </span>
                      Disconnect
                    </button>
                  </div>
                  <a
                    href="/api/spotify/connect"
                    className="flex h-9 items-center justify-center gap-2 rounded-xl border border-[#1DB954]/20 text-xs font-medium text-[#1DB954]/70 transition-all hover:bg-[#1DB954]/10"
                  >
                    <span className="material-symbols-outlined text-[14px]">sync</span>
                    Reconnect with fresh permissions
                  </a>
                </div>
              )}

              {spotifyError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{spotifyError}</div>}
            </div>

            {/* Active playlist banner */}
            {(() => {
              const active = importedPlaylists.find(p => p.id === activePlaylistId);
              if (!active) return null;
              return (
                <div className="rounded-2xl border border-[#1DB954]/30 bg-[#1DB954]/10 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#1DB954]">radio</span>
                    <p className="text-xs font-bold tracking-wider text-[#1DB954] uppercase">Active Playlist</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="size-14 shrink-0 rounded-xl bg-white/10 bg-cover bg-center"
                      style={active.imageUrl ? { backgroundImage: `url('${active.imageUrl}')` } : {}}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold">{active.name}</p>
                      <p className="text-xs text-slate-300">{active.trackCount} songs · available in Browse</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Spotify playlists to import */}
            {spotifyPlaylists.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-bold tracking-wider text-slate-400 uppercase">Your Spotify Playlists</h3>
                <div className="flex flex-col gap-2">
                  {spotifyPlaylists.map(pl => {
                    const importedEntry = importedPlaylists.find(ip => ip.spotifyPlaylistId === pl.id);
                    const isActive = importedEntry?.id === activePlaylistId;
                    return (
                      <div
                        key={pl.id}
                        className={`bg-surface-dark flex items-center gap-3 rounded-xl border p-3 ${isActive ? 'border-[#1DB954]/40' : 'border-white/5'}`}
                      >
                        <div
                          className="size-12 shrink-0 rounded-lg bg-white/5 bg-cover bg-center"
                          style={pl.imageUrl ? { backgroundImage: `url('${pl.imageUrl}')` } : {}}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{pl.name}</p>
                            {isActive && <span className="shrink-0 rounded-full bg-[#1DB954]/20 px-2 py-0.5 text-[10px] font-bold text-[#1DB954]">ACTIVE</span>}
                          </div>
                          <p className="text-xs text-slate-400">{pl.trackCount} songs</p>
                        </div>
                        <button
                          onClick={() => handleImport(pl)}
                          disabled={importing === pl.id}
                          className="flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold text-white transition-all active:scale-95"
                          style={{ background: isActive ? '#1DB954' : 'linear-gradient(135deg, #f20da6, #9333ea)' }}
                        >
                          {importing === pl.id ? (
                            <span className="material-symbols-outlined animate-spin text-[14px]">refresh</span>
                          ) : isActive ? (
                            <>
                              <span className="material-symbols-outlined text-[14px]">check</span> Active
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[14px]">download</span> {importedEntry ? 'Re-import' : 'Import'}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All imported playlists */}
            {importedPlaylists.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-bold tracking-wider text-slate-400 uppercase">Imported Playlists</h3>
                <div className="flex flex-col gap-2">
                  {importedPlaylists.map(pl => {
                    const isActive = pl.id === activePlaylistId;
                    return (
                      <div
                        key={pl.id}
                        className={`bg-surface-dark flex items-center gap-3 rounded-xl border p-3 ${isActive ? 'border-[#1DB954]/30' : 'border-white/5'}`}
                      >
                        <div
                          className="size-12 shrink-0 rounded-lg bg-white/5 bg-cover bg-center"
                          style={pl.imageUrl ? { backgroundImage: `url('${pl.imageUrl}')` } : {}}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{pl.name}</p>
                          <p className="text-xs text-slate-400">{pl.trackCount} songs</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {isActive ? (
                            <span className="material-symbols-outlined text-[20px] text-[#1DB954]">radio</span>
                          ) : (
                            <span className="material-symbols-outlined text-[20px] text-white/20">radio_button_unchecked</span>
                          )}
                          <button
                            onClick={() => handleRemovePlaylist(pl)}
                            disabled={removing === pl.id}
                            title="Remove import"
                            className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-white/40 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95 disabled:opacity-50"
                          >
                            {removing === pl.id ? (
                              <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                            ) : (
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!spotifyConnected && importedPlaylists.length === 0 && spotifyPlaylists.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="material-symbols-outlined text-5xl text-white/20">library_music</span>
                <p className="text-sm font-medium text-white/40">No playlists yet</p>
                <p className="text-xs text-white/20">Connect Spotify above to import playlists</p>
              </div>
            )}
          </div>
        )}

        {/* ── QR Code ── */}
        {tab === 'qr' && (
          <div className="flex flex-col items-center gap-6 py-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h3 className="text-base font-bold">Venue QR Code</h3>
              <p className="max-w-[240px] text-xs text-slate-400">Customers scan this to see the live queue and request songs.</p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-2xl">
              <QRCodeSVG
                value={typeof window !== 'undefined' ? `${window.location.origin}/queue` : '/queue'}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>

            <div className="bg-surface-dark flex w-full items-center gap-3 rounded-xl border border-white/5 px-4 py-3">
              <span className="material-symbols-outlined text-[18px] text-white/30">link</span>
              <span className="flex-1 truncate font-mono text-xs text-white/50">
                {typeof window !== 'undefined' ? `${window.location.origin}/queue` : '/queue'}
              </span>
            </div>

            <p className="text-center text-[10px] text-white/20">Post this QR code at your venue for guests to scan.</p>
          </div>
        )}
      </main>
    </div>
  );
}
