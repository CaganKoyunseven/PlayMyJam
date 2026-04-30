'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import NowPlaying from '@/components/now-playing';
import { supabase } from '@/lib/supabase';
import { getQueueItems, QueueItem } from '@/lib/db';
import { DEFAULT_VENUE_ID } from '@/lib/constants';

function SpotifyBanners() {
  const searchParams = useSearchParams();
  const spotifyConnected = searchParams.get('spotify_connected') === '1';
  const spotifyError = searchParams.get('spotify_error');
  return (
    <>
      {spotifyConnected && (
        <div className="mt-2 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
          <span className="text-sm text-green-400 font-medium">Spotify connected successfully</span>
        </div>
      )}
      {spotifyError && (
        <div className="mt-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-400 text-[18px]">error</span>
          <span className="text-sm text-red-400 font-medium">Spotify error: {spotifyError}</span>
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
    getQueueItems().then((items) => {
      setQueue(items.filter((i) => !i.isPlaying));
      setNowPlayingItem(items.find((i) => i.isPlaying) ?? null);
      setLoading(false);
    });

    // Realtime subscription
    const channel = supabase
      .channel('queue_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `venue_id=eq.${DEFAULT_VENUE_ID}` },
        () => {
          getQueueItems().then((items) => {
            setQueue(items.filter((i) => !i.isPlaying));
            setNowPlayingItem(items.find((i) => i.isPlaying) ?? null);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark max-w-md mx-auto">
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
        {/* Spotify status banners */}
        <Suspense><SpotifyBanners /></Suspense>

        {/* Now Playing */}
        <section className="mt-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary animate-pulse">equalizer</span>
              Now Playing
            </h2>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/20 text-primary uppercase tracking-wider">
              LIVE
            </span>
          </div>

          <NowPlaying
            playlistUri={nowPlayingItem ? undefined : undefined}
          />

          {nowPlayingItem && (
            <div className="text-center mt-4 space-y-1">
              <h3 className="text-xl font-bold">{nowPlayingItem.title}</h3>
              <p className="text-slate-400">{nowPlayingItem.artist}</p>
            </div>
          )}
        </section>

        {/* Queue List */}
        <section className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Up Next</h3>
            <span className="text-sm text-slate-400">{queue.length} songs in queue</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined text-white/20 text-5xl animate-spin">refresh</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="material-symbols-outlined text-white/20 text-5xl">queue_music</span>
              <p className="text-white/40 text-sm font-medium">Queue is empty</p>
              <Link href="/browse" className="text-primary text-sm font-bold hover:underline">
                Browse songs to add
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {queue.map((song, index) => (
                <div
                  key={song.id}
                  className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 shadow-sm ${
                    index === 0
                      ? 'bg-primary/10 border-primary/40 shadow-[0_0_10px_rgba(242,13,166,0.1)]'
                      : 'bg-surface-dark border-transparent hover:border-primary/50'
                  }`}
                >
                  <div className={`shrink-0 size-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    index === 0 ? 'bg-primary text-white' : 'bg-white/10 text-white/40'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="relative shrink-0 size-14 rounded overflow-hidden">
                    {song.albumArt ? (
                      <img src={song.albumArt} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-dark flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/20">music_note</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-lg">play_arrow</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate">{song.title}</p>
                    <p className="text-sm text-slate-400 truncate">{song.artist}</p>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    {index === 0 && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Next</span>
                    )}
                    <button className="p-2 hover:text-white transition-colors">
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
      <div className="fixed bottom-20 left-0 right-0 p-4 z-40 flex justify-center max-w-md mx-auto pointer-events-none">
        <Link
          href="/request"
          className="pointer-events-auto w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 text-white"
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
