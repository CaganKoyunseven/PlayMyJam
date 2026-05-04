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
    }>(EventType.SONG_ADDED_TO_LIBRARY, event => {
      const mySession = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
      const isOwn = !!mySession && mySession === event.payload.requestedBySessionId;

      const msg = isOwn
        ? `Your request was approved! "${event.payload.title}" is now in the library.`
        : `New song added: "${event.payload.title}" by ${event.payload.artist}`;

      const notification: Notification = { id: event.id, msg, isOwn };
      setNotifications(prev => [...prev, notification]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    });

    return () => unsubscribe();
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2">
      {notifications.map(n => (
        <div
          key={n.id}
          className={`animate-in slide-in-from-top-2 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium text-white shadow-xl duration-300 ${
            n.isOwn ? 'border-green-500/30 bg-green-500/20' : 'bg-surface-dark border-white/10'
          }`}
        >
          <span
            className={`material-symbols-outlined mt-0.5 shrink-0 text-[18px] ${n.isOwn ? 'text-green-400' : 'text-primary'}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {n.isOwn ? 'check_circle' : 'library_add'}
          </span>
          <span>{n.msg}</span>
        </div>
      ))}
    </div>
  );
}
