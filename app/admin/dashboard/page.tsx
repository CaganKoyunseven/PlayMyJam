'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getPendingRequests,
  getQueueItems,
  approveRequest,
  rejectRequest,
  removeQueueItem,
  setNowPlaying,
  SongRequest,
  QueueItem,
} from '@/lib/db';
import { initObservers, teardownObservers } from '@/lib/observers';
import { DEFAULT_VENUE_ID } from '@/lib/constants';

const SESSION_KEY = 'pmj_admin_auth';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [nowPlaying, setNowPlayingItem] = useState<QueueItem | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [tab, setTab] = useState<'requests' | 'queue'>('requests');

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      router.replace('/admin');
      return;
    }
    initObservers();
    load();

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

  async function handleApprove(req: SongRequest) {
    setActing(req.id);
    await approveRequest(req.id, req.songId, req.sessionId);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
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

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    router.replace('/admin');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background-dark max-w-md mx-auto">
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
        <button
          onClick={() => setTab('requests')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'requests' ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'
          }`}
        >
          Requests
          {requests.length > 0 && (
            <span className={`size-5 rounded-full text-[11px] flex items-center justify-center font-black ${tab === 'requests' ? 'bg-white/20' : 'bg-primary text-white'}`}>
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('queue')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'queue' ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'
          }`}
        >
          Queue
          {queue.length > 0 && (
            <span className={`size-5 rounded-full text-[11px] flex items-center justify-center font-black ${tab === 'queue' ? 'bg-white/20' : 'bg-white/20 text-white'}`}>
              {queue.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col gap-3 px-4 pt-4 pb-10">

        {/* ── Pending Requests ── */}
        {tab === 'requests' && (
          <>
            {requests.length === 0 ? (
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
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-white/30">{timeAgo(req.requestedAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={acting === req.id}
                      className="flex h-8 w-20 items-center justify-center gap-1 rounded-xl bg-green-500/20 text-green-400 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                    >
                      {acting === req.id ? (
                        <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                      ) : (
                        <><span className="material-symbols-outlined text-[14px]">check</span> Approve</>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={acting === req.id}
                      className="flex h-8 w-20 items-center justify-center gap-1 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── Queue ── */}
        {tab === 'queue' && (
          <>
            {queue.length === 0 ? (
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
            )}
          </>
        )}
      </main>
    </div>
  );
}
