'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import { getVenueToken } from '@/lib/spotify-auth';
import { getVenuePlaylists, importPlaylist, checkSpotifyConnection, SpotifyPlaylist } from '@/lib/spotify-api';
import { getVenueImportedPlaylists, PlaylistRow } from '@/lib/db';

export default function VenuePage() {
  const router = useRouter();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [importedPlaylists, setImportedPlaylists] = useState<PlaylistRow[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    checkSpotifyConnection().then(({ connected: c }) => setConnected(c));
    getVenueImportedPlaylists().then(setImportedPlaylists);
  }, []);

  useEffect(() => {
    if (connected === true) {
      checkVenueToken();
    }
  }, [connected]);

  async function checkVenueToken() {
    try {
      const token = await getVenueToken();
      if (token) fetchSpotifyPlaylists();
    } catch {}
  }

  async function fetchSpotifyPlaylists() {
    setLoadingPlaylists(true);
    setError(null);
    try {
      const pls = await getVenuePlaylists();
      setSpotifyPlaylists(pls);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoadingPlaylists(false);
  }

  async function handleImport(pl: SpotifyPlaylist) {
    setImporting(pl.id);
    setError(null);
    try {
      const { imported } = await importPlaylist(pl.id);
      setToast(`Imported "${pl.name}" — ${imported} songs`);
      setTimeout(() => setToast(null), 3000);
      const updated = await getVenueImportedPlaylists();
      setImportedPlaylists(updated);
    } catch (e) {
      setError((e as Error).message);
    }
    setImporting(null);
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark pb-24 max-w-md mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-surface-dark border border-white/10 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background-dark/95 backdrop-blur-md">
        <button onClick={() => router.back()} className="flex size-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center">Venue Settings</h2>
        <div className="size-10" />
      </header>

      <div className="flex flex-col gap-6 px-4 pt-4">
        {/* Spotify Connection */}
        <section className="bg-surface-dark rounded-2xl border border-white/5 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#1DB954]">music_note</span>
              </div>
              <div>
                <p className="font-bold text-sm">Spotify</p>
                <p className="text-xs text-slate-400">
                  {connected === null ? 'Checking…' : connected ? 'API reachable' : 'API unreachable'}
                </p>
              </div>
            </div>
            <div className={`size-2 rounded-full ${connected === null ? 'bg-yellow-400' : connected ? 'bg-green-400' : 'bg-red-400'}`} />
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
              className="flex h-11 items-center justify-center gap-2 rounded-xl font-bold text-sm text-white border border-[#1DB954]/40 hover:bg-[#1DB954]/10 transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-[#1DB954]">refresh</span>
              Refresh Playlists
            </button>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </section>

        {/* Spotify Playlists — select to import */}
        {loadingPlaylists ? (
          <div className="flex items-center justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-white/30">refresh</span>
          </div>
        ) : spotifyPlaylists.length > 0 && (
          <section>
            <h3 className="text-base font-bold mb-3">Your Spotify Playlists</h3>
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
                        alreadyImported
                          ? 'bg-green-500/20 text-green-400'
                          : 'text-white'
                      }`}
                      style={!alreadyImported ? { background: 'linear-gradient(135deg, #f20da6, #9333ea)' } : {}}
                    >
                      {importing === pl.id ? (
                        <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                      ) : alreadyImported ? (
                        <><span className="material-symbols-outlined text-[14px]">check</span> Imported</>
                      ) : (
                        <><span className="material-symbols-outlined text-[14px]">download</span> Import</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Imported playlists */}
        {importedPlaylists.length > 0 && (
          <section>
            <h3 className="text-base font-bold mb-3">Imported Playlists</h3>
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
                  <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav active="queue" />
    </div>
  );
}
