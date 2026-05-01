'use client';

import { useEffect, useState } from 'react';
import { subscribe, EventType } from '@/lib/event-bus';

const SESSION_KEY = 'pmj_session_id';

type Notification = {
  id: string;
  msg: string;
  isOwn: boolean;
};

export default function NotificationListener() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe<{
      songId: string;
      title: string;
      artist: string;
      requestedBySessionId: string | null;
    }>(EventType.SONG_ADDED_TO_LIBRARY, (event) => {
      const mySession = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
      const isOwn = !!mySession && mySession === event.payload.requestedBySessionId;

      const msg = isOwn
        ? `Your request was approved! "${event.payload.title}" is now in the library.`
        : `New song added: "${event.payload.title}" by ${event.payload.artist}`;

      const notification: Notification = { id: event.id, msg, isOwn };
      setNotifications((prev) => [...prev, notification]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, 5000);
    });

    return () => unsubscribe();
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium text-white animate-in slide-in-from-top-2 duration-300 ${
            n.isOwn
              ? 'bg-green-500/20 border-green-500/30'
              : 'bg-surface-dark border-white/10'
          }`}
        >
          <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${n.isOwn ? 'text-green-400' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {n.isOwn ? 'check_circle' : 'library_add'}
          </span>
          <span>{n.msg}</span>
        </div>
      ))}
    </div>
  );
}
