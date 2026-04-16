import BottomNav from '@/components/bottom-nav';
import { trendingSongs } from '@/lib/mock-data';

export default function RequestPage() {
  return (
    <div
      className="relative flex min-h-screen w-full flex-col max-w-md mx-auto"
      style={{ background: '#23101d' }}
    >
      <div className="flex flex-col flex-1">
        {/* Drag Handle */}
        <button className="flex h-7 w-full items-center justify-center mt-2">
          <div className="h-1 w-9 rounded-full bg-surface-dark" />
        </button>

        {/* Search */}
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

        {/* Trending Songs */}
        <h3 className="text-white text-lg font-bold px-4 pb-2 pt-4">Trending Songs</h3>

        <div className="flex flex-col pb-24">
          {trendingSongs.map((song) => (
            <div
              key={song.id}
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
                {song.tokens} Token
              </button>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="browse" />
    </div>
  );
}
