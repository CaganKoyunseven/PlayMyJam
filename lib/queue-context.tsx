'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { getQueueEntries, insertQueueEntry, QueueEntry } from './db';

type AddToQueueInput = {
  spotifyTrackId: string;
  trackTitle: string;
  trackArtist: string;
  albumArtUrl?: string;
};

type QueueContextType = {
  queue: QueueEntry[];
  loading: boolean;
  addToQueue: (entry: AddToQueueInput) => void;
  isInQueue: (spotifyTrackId: string) => boolean;
};

const QueueContext = createContext<QueueContextType | null>(null);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQueueEntries().then(entries => {
      setQueue(entries);
      setLoading(false);
    });
  }, []);

  async function addToQueue(entry: AddToQueueInput) {
    const optimistic: QueueEntry = {
      id: entry.spotifyTrackId,
      title: entry.trackTitle,
      artist: entry.trackArtist,
      albumArt: entry.albumArtUrl ?? '',
      waitMinutes: 0,
      tokens: 1,
    };

    setQueue(prev => [optimistic, ...prev.filter(s => s.id !== entry.spotifyTrackId)]);
    await insertQueueEntry(entry);
  }

  function isInQueue(spotifyTrackId: string) {
    return queue.some(s => s.id === spotifyTrackId);
  }

  return <QueueContext.Provider value={{ queue, loading, addToQueue, isInQueue }}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used inside QueueProvider');
  return ctx;
}
