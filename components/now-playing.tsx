'use client';

import { useEffect, useState, useRef } from 'react';
import { initSpotifyPlayer, disconnectPlayer, defaultPlaybackState, PlaybackState } from '@/lib/spotify-playback';
import { pausePlayback, resumePlayback, skipToNext, startPlayback } from '@/lib/spotify-api';
import { setNowPlaying } from '@/lib/db';

type Props = {
  playlistUri?: string;
  onTrackChange?: (trackName: string, artistName: string) => void;
};

export default function NowPlaying({ playlistUri, onTrackChange }: Props) {
  const [state, setState] = useState<PlaybackState>(defaultPlaybackState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const deviceIdRef = useRef<string | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function getToken() {
      const res = await fetch('/api/spotify/token');
      const data = await res.json();
      if (!data.token) throw new Error('No token');
      return data.token;
    }

    initSpotifyPlayer(
      getToken,
      (newState) => {
        setState((prev) => ({ ...newState, deviceId: deviceIdRef.current }));
        onTrackChange?.(newState.trackName, newState.artistName);
      },
      (deviceId) => {
        deviceIdRef.current = deviceId;
        setState((prev) => ({ ...prev, deviceId }));
        setLoading(false);
        if (playlistUri) {
          startPlayback(deviceId, playlistUri).catch(() => {});
        }
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      }
    );

    return () => {
      disconnectPlayer();
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  // Tick progress locally between state updates
  useEffect(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (state.isPlaying) {
      progressRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          progressMs: Math.min(prev.progressMs + 500, prev.durationMs),
        }));
      }, 500);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [state.isPlaying, state.trackName]);

  const progress = state.durationMs > 0 ? (state.progressMs / state.durationMs) * 100 : 0;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="material-symbols-outlined animate-spin text-white/30">refresh</span>
        <span className="ml-2 text-sm text-white/30">Connecting to Spotify…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs font-bold text-red-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-2">
      {/* Album art */}
      <div className="relative size-48 rounded-2xl overflow-hidden shadow-2xl">
        {state.albumArt ? (
          <img src={state.albumArt} alt={state.trackName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface-dark flex items-center justify-center">
            <span className="material-symbols-outlined text-white/20 text-5xl">album</span>
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="text-center">
        <p className="text-lg font-bold truncate max-w-xs">
          {state.trackName || 'Not playing'}
        </p>
        <p className="text-sm text-slate-400">{state.artistName}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full flex items-center gap-2">
        <span className="text-xs font-mono text-slate-500 w-10 text-right">{fmt(state.progressMs)}</span>
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f20da6, #9333ea)' }}
          />
        </div>
        <span className="text-xs font-mono text-slate-500 w-10">{fmt(state.durationMs)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => (state.isPlaying ? pausePlayback() : resumePlayback())}
          className="flex size-14 items-center justify-center rounded-full text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #f20da6, #9333ea)' }}
        >
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {state.isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <button
          onClick={() => skipToNext()}
          className="flex size-10 items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            skip_next
          </span>
        </button>
      </div>
    </div>
  );
}
