'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/bottom-nav';
import { getTrendingTracks, SpotifyTrack } from '@/lib/spotify';

export default function RequestPage() {
  const [trending, setTrending] = useState<SpotifyTrack[]>([]);

  useEffect(() => {
    getTrendingTracks().then(setTrending);
  }, []);

  return (
    <div
      className="relative flex min-h-screen w-full flex-col max-w-md mx-auto"
      style={{ background: '#23101d' }}
    >
      <div className="flex flex-col flex-1">
        <button className="flex h-7 w-full items-center justify-center mt-2">
          <div className="h-1 w-9 rounded-full bg-surface-dark" />
        </button>

        <div className="px-4 py-3">
          <label className="flex h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-center pl-4 pr-2 text-surface-muted"
                style={{ background: '#392833' }}
              >
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                placeholder="Search for a song..."
                className="flex-1 text-white text-base placeholder:text-surface-muted px-2 focus:outline-none border-none"
                style={{ background: '#392833' }}
              />
            </div>
          </label>
        </div>

        <h3 className="text-white text-lg font-bold px-4 pb-2 pt-4">Trending Songs</h3>

        <div className="flex flex-col pb-24">
          {trending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="material-symbols-outlined text-white/20 text-5xl">trending_up</span>
              <p className="text-white/40 text-sm font-medium">No trending songs yet</p>
              <p className="text-white/20 text-xs">Connect Spotify to see trending tracks</p>
            </div>
          ) : (
            trending.map((song) => (
              <div
                key={song.spotifyId}
                className="flex items-center justify-between px-4 py-2 min-h-[72px]"
                style={{ background: '#23101d' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="size-14 rounded-lg bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url('${song.albumArt}')` }}
                  />
                  <div className="flex flex-col">
                    <p className="text-white text-base font-medium line-clamp-1">{song.title}</p>
                    <p className="text-surface-muted text-sm line-clamp-1">{song.artist}</p>
                  </div>
                </div>
                <button
                  className="flex items-center justify-center h-8 px-4 rounded-full text-white text-sm font-medium shrink-0"
                  style={{ background: '#49223c' }}
                >
                  1 Token
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav active="browse" />
    </div>
  );
}
