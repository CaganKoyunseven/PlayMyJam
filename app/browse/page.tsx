'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import { browseSongs, Genre } from '@/lib/mock-data';
import { useQueue } from '@/lib/queue-context';

const genres: ('All' | Genre)[] = ['All', 'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Latin'];

export default function BrowsePage() {
  const router = useRouter();
  const { addToQueue, isInQueue } = useQueue();
  const [activeGenre, setActiveGenre] = useState<'All' | Genre>('All');
  const [search, setSearch] = useState('');

  const filtered = browseSongs.filter((song) => {
    const matchesGenre = activeGenre === 'All' || song.genre === activeGenre;
    const matchesSearch =
      search === '' ||
      song.title.toLowerCase().includes(search.toLowerCase()) ||
      song.artist.toLowerCase().includes(search.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark pb-24 max-w-md mx-auto">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background-dark/95 backdrop-blur-md">
        <button className="flex size-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center">Browse Library</h2>
        <button className="flex size-10 items-center justify-center rounded-full text-white active:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">filter_list</span>
        </button>
      </header>

      {/* Sticky Search + Filters */}
      <div className="sticky top-[72px] z-20 bg-background-dark flex flex-col gap-4 px-4 pt-2 pb-3">
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
              <button
                onClick={() => setSearch('')}
                className="flex items-center justify-center pr-4 text-white/40 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Genre Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 snap-x">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className={`snap-start flex h-8 shrink-0 items-center justify-center rounded-full px-5 transition-colors ${
                activeGenre === genre
                  ? 'bg-primary text-white font-bold shadow-lg shadow-primary/25'
                  : 'bg-white/5 border border-white/5 text-white/60 font-bold hover:bg-white/10'
              }`}
            >
              <span className="text-xs uppercase tracking-wider">{genre}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Song List */}
      <div className="flex flex-col px-4 divide-y divide-white/5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="material-symbols-outlined text-white/20 text-5xl">music_off</span>
            <p className="text-white/40 text-sm font-medium">No songs found</p>
          </div>
        ) : (
          filtered.map((song) => (
            <div
              key={song.id}
              className="flex items-center gap-4 py-3 active:bg-white/5 transition-colors cursor-pointer group"
            >
              {/* Album Art */}
              <div className="relative size-12 shrink-0 rounded-full overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${song.albumArt}')` }}
                />
              </div>

              {/* Info */}
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{song.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/50 truncate">{song.artist}</span>
                  <span className="size-1 rounded-full bg-white/20 shrink-0" />
                  <span className="text-[10px] font-bold text-white/30 shrink-0">{song.genre}</span>
                  <span className="size-1 rounded-full bg-white/20 shrink-0" />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="text-[10px] font-bold text-primary">{song.tokens}</span>
                    <span
                      className="material-symbols-outlined text-[10px] text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      token
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={() => {
                  addToQueue({ ...song, waitMinutes: 0 });
                  router.push('/queue');
                }}
                className={`size-10 flex items-center justify-center active:scale-90 transition-all ${
                  isInQueue(song.id) ? 'text-green-400' : 'text-white/40 group-hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined" style={isInQueue(song.id) ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {isInQueue(song.id) ? 'check_circle' : 'add_circle'}
                </span>
              </button>
            </div>
          ))
        )}
      </div>

      <BottomNav active="browse" />
    </div>
  );
}
