'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { QueueSong, queueSongs as initialQueue } from './mock-data';

type QueueContextType = {
  queue: QueueSong[];
  addToQueue: (song: QueueSong) => void;
  isInQueue: (id: string) => boolean;
};

const QueueContext = createContext<QueueContextType | null>(null);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueSong[]>(initialQueue);

  function addToQueue(song: QueueSong) {
    setQueue((prev) => {
      // Remove if already exists, then add to top
      const without = prev.filter((s) => s.id !== song.id);
      return [song, ...without];
    });
  }

  function isInQueue(id: string) {
    return queue.some((s) => s.id === id);
  }

  return (
    <QueueContext.Provider value={{ queue, addToQueue, isInQueue }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used inside QueueProvider');
  return ctx;
}
