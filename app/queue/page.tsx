'use client';

import { useEffect, useState, Suspense } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import BottomNav from '@/components/bottom-nav';
import VirtualPlayer from '@/components/virtual-player';
import { DEFAULT_VENUE_ID } from '@/lib/constants';
import { getQueueItems, QueueItem } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function SpotifyBanners() {
  const searchParams = useSearchParams();
  const spotifyConnected = searchParams.get('spotify_connected') === '1';
  const spotifyError = searchParams.get('spotify_error');
  return (
    <>
      {spotifyConnected && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
          <span className="material-symbols-outlined text-[18px] text-green-400">check_circle</span>
          <span className="text-sm font-medium text-green-400">Spotify connected successfully</span>
        </div>
      )}
      {spotifyError && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <span className="material-symbols-outlined text-[18px] text-red-400">error</span>
          <span className="text-sm font-medium text-red-400">Spotify error: {spotifyError}</span>
        </div>
      )}
    </>
  );
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowPlayingItem, setNowPlayingItem] = useState<QueueItem | null>(null);

  useEffect(() => {
    getQueueItems().then(async items => {
      const playing = items.find(i => i.isPlaying);
      const upcoming = items.filter(i => !i.isPlaying);
      setQueue(upcoming);
      setNowPlayingItem(playing ?? null);
      setLoading(false);

      // Auto-start playback if nothing is playing but queue has songs
      if (!playing && upcoming.length > 0) {
        const { advanceQueue } = await import('@/lib/db');
        await advanceQueue();
        // Refetch after advancing
        const refreshed = await getQueueItems();
        setQueue(refreshed.filter(i => !i.isPlaying));
        setNowPlayingItem(refreshed.find(i => i.isPlaying) ?? null);
      }
    });

    // Realtime subscription
    const channel = supabase
      .channel('queue_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_items', filter: `venue_id=eq.${DEFAULT_VENUE_ID}` }, () => {
        getQueueItems().then(items => {
          setQueue(items.filter(i => !i.isPlaying));
          setNowPlayingItem(items.find(i => i.isPlaying) ?? null);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden">
      <header className="bg-background-dark/90 sticky top-0 z-50 flex items-center justify-between p-4 backdrop-blur-md">
        <button className="flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">The Neon Lounge</h1>
        <button className="flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10">
          <span className="material-symbols-outlined text-2xl">settings</span>
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 pb-40">
        {/* Spotify status banners */}
        <Suspense>
          <SpotifyBanners />
        </Suspense>

        {/* Now Playing */}
        <section className="mt-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <span className="material-symbols-outlined text-primary animate-pulse">equalizer</span>
              Now Playing
            </h2>
            <span className="bg-primary/20 text-primary rounded px-2 py-1 text-xs font-semibold tracking-wider uppercase">LIVE</span>
          </div>

          <VirtualPlayer
            nowPlaying={nowPlayingItem}
            autoAdvance={true}
          />
        </section>

        {/* Queue List */}
        <section className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">Up Next</h3>
            <span className="text-sm text-slate-400">{queue.length} songs in queue</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined animate-spin text-5xl text-white/20">refresh</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-white/20">queue_music</span>
              <p className="text-sm font-medium text-white/40">Queue is empty</p>
              <Link
                href="/browse"
                className="text-primary text-sm font-bold hover:underline"
              >
                Browse songs to add
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {queue.map((song, index) => (
                <div
                  key={song.id}
                  className={`group flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-all duration-300 ${
                    index === 0
                      ? 'bg-primary/10 border-primary/40 shadow-[0_0_10px_rgba(242,13,166,0.1)]'
                      : 'bg-surface-dark hover:border-primary/50 border-transparent'
                  }`}
                >
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                      index === 0 ? 'bg-primary text-white' : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="relative size-14 shrink-0 overflow-hidden rounded">
                    {song.albumArt ? (
                      <img
                        src={song.albumArt}
                        alt={song.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="bg-surface-dark flex h-full w-full items-center justify-center">
                        <span className="material-symbols-outlined text-white/20">music_note</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="material-symbols-outlined text-lg text-white">play_arrow</span>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-white">{song.title}</h3>
                      {song.isPriority && (
                        <span className="bg-primary/20 flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black tracking-tighter text-primary uppercase">
                          <span
                            className="material-symbols-outlined text-[10px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            token
                          </span>
                          Request
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/50">{song.artist}</p>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    {index === 0 && <span className="text-primary text-[10px] font-bold tracking-wider uppercase">Next</span>}
                    <button className="p-2 transition-colors hover:text-white">
                      <span className="material-symbols-outlined text-[20px]">info</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      <div className="pointer-events-none fixed right-0 bottom-20 left-0 z-40 mx-auto flex max-w-md justify-center p-4">
        <Link
          href="/request"
          className="pointer-events-auto flex h-14 w-full items-center justify-center gap-3 rounded-xl text-lg font-bold text-white shadow-lg transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
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
