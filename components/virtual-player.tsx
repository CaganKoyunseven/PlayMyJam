'use client';

import { useEffect, useRef, useState } from 'react';

import { advanceQueue, QueueItem } from '@/lib/db';

type Props = {
  nowPlaying: QueueItem | null;
  // Only one client should auto-advance the queue (typically the admin dashboard).
  autoAdvance?: boolean;
  // Compact: progress bar + timestamps only (no album art / title block).
  compact?: boolean;
};

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function elapsedMs(startedAt: string | null): number {
  if (!startedAt) return 0;
  return Math.max(0, Date.now() - new Date(startedAt).getTime());
}

export default function VirtualPlayer({ nowPlaying, autoAdvance = false, compact = false }: Props) {
  // Tick counter — incremented every 500ms to force re-render. Progress itself
  // is derived during render from `Date.now() - startedAt`, so we never call
  // setState synchronously in the effect body.
  const [, setTick] = useState(0);
  const advancingRef = useRef(false);
  const startedAt = nowPlaying?.startedAt ?? null;

  useEffect(() => {
    advancingRef.current = false;
  }, [startedAt]);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, [startedAt]);

  const progressMs = elapsedMs(startedAt);

  useEffect(() => {
    if (!autoAdvance || !nowPlaying || !startedAt) return;
    if (nowPlaying.durationMs <= 0) return;

    // Debug logging for auto-advance (only when close to finishing)
    if (progressMs > nowPlaying.durationMs - 2000) {
      console.log('[VirtualPlayer] progress:', progressMs, '/', nowPlaying.durationMs, 'advancing:', advancingRef.current);
    }

    if (progressMs < nowPlaying.durationMs) return;
    if (advancingRef.current) return;

    console.log('[VirtualPlayer] Triggering auto-advance for:', nowPlaying.title);
    advancingRef.current = true;
    advanceQueue().catch(err => {
      console.error('[VirtualPlayer] advanceQueue failed:', err);
      advancingRef.current = false;
    });
  }, [autoAdvance, nowPlaying, startedAt, progressMs]);

  if (!nowPlaying) {
    if (compact) return null;
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-2">
        <div className="bg-surface-dark relative flex size-48 items-center justify-center overflow-hidden rounded-2xl shadow-2xl">
          <span className="material-symbols-outlined text-5xl text-white/20">album</span>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">Nothing playing</p>
          <p className="text-sm text-slate-400">Waiting for the DJ…</p>
        </div>
      </div>
    );
  }

  const duration = nowPlaying.durationMs || 0;
  const clamped = duration > 0 ? Math.min(progressMs, duration) : progressMs;
  const pct = duration > 0 ? (clamped / duration) * 100 : 0;

  if (compact) {
    return (
      <div className="flex w-full items-center gap-2">
        <span className="w-10 text-right font-mono text-[10px] text-white/50">{fmt(clamped)}</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #f20da6, #9333ea)' }}
          />
        </div>
        <span className="w-10 font-mono text-[10px] text-white/50">{fmt(duration)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-2">
      <div className="relative size-48 overflow-hidden rounded-2xl shadow-2xl">
        {nowPlaying.albumArt ? (
          <img
            src={nowPlaying.albumArt}
            alt={nowPlaying.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="bg-surface-dark flex h-full w-full items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-white/20">album</span>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="max-w-xs truncate text-lg font-bold">{nowPlaying.title}</p>
        <p className="text-sm text-slate-400">{nowPlaying.artist}</p>
      </div>

      <div className="flex w-full items-center gap-2">
        <span className="w-10 text-right font-mono text-xs text-slate-500">{fmt(clamped)}</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #f20da6, #9333ea)' }}
          />
        </div>
        <span className="w-10 font-mono text-xs text-slate-500">{fmt(duration)}</span>
      </div>
    </div>
  );
}
