'use client';

import Link from 'next/link';
import BottomNav from '@/components/bottom-nav';
import { nowPlaying } from '@/lib/mock-data';
import { useQueue } from '@/lib/queue-context';

export default function QueuePage() {
  const { queue, loading } = useQueue();

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
              <span className="material-symbols-outlined text-primary animate-pulse">equalizer</span>
              Now Playing
            </h2>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/20 text-primary uppercase tracking-wider">
              LIVE
            </span>
          </div>

          {/* Vinyl Disc */}
          <div className="relative group w-full aspect-square max-w-[300px] mx-auto">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
              style={{ background: 'linear-gradient(to top right, #f20da6, #9333ea, #2563eb)' }}
            />
            <div className="relative w-full h-full rounded-full border-4 border-white/10 bg-black shadow-2xl flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 rounded-full opacity-20"
                style={{ background: 'repeating-radial-gradient(#111 0, #111 2px, #222 3px, #222 4px)' }}
              />
              <div className="relative w-[65%] h-[65%] rounded-full overflow-hidden border-8 border-black shadow-lg animate-spin [animation-duration:10s]">
                <img src={nowPlaying.albumArt} alt={nowPlaying.title} className="w-full h-full object-cover" />
              </div>
              <div className="absolute w-4 h-4 bg-background-dark rounded-full z-10" />
            </div>
          </div>

          {/* Song info */}
          <div className="text-center mt-6 space-y-1">
            <h3 className="text-2xl font-bold">{nowPlaying.title}</h3>
            <p className="text-slate-400 text-lg">{nowPlaying.artist}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-1 w-full max-w-[120px] bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${nowPlaying.progress}%` }} />
              </div>
              <span className="text-xs font-mono text-slate-400">
                {nowPlaying.currentTime} / {nowPlaying.totalTime}
              </span>
            </div>
          </div>
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
                  {/* Position badge */}
                  <div className={`shrink-0 size-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    index === 0 ? 'bg-primary text-white' : 'bg-white/10 text-white/40'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="relative shrink-0 size-14 rounded overflow-hidden">
                    <img src={song.albumArt} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-lg">play_arrow</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate">{song.title}</p>
                    <p className="text-sm text-slate-400 truncate">{song.artist}</p>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    {song.waitMinutes > 0 && (
                      <span className="text-xs font-bold text-slate-500">{song.waitMinutes} min</span>
                    )}
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
