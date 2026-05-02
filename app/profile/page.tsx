'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/bottom-nav';
import { getSessionProfile, SessionProfile } from '@/lib/db';

const SESSION_KEY = 'pmj_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sid = getSessionId();
    getSessionProfile(sid).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="bg-background-dark flex min-h-screen items-center justify-center">
        <span className="material-symbols-outlined text-white/20 text-5xl animate-spin">refresh</span>
      </div>
    );
  }

  const shortId = profile ? profile.sessionId.slice(0, 8).toUpperCase() : '—';

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="bg-background-dark/80 sticky top-0 z-50 flex items-center justify-between border-b border-white/5 p-4 pb-2 backdrop-blur-md">
        <button className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="flex-1 pr-10 text-center text-lg font-bold">Profile</h2>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4">
          <div className="relative">
            <div className="border-primary/40 size-24 rounded-full border-4 bg-surface-dark flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white/30 text-4xl">person</span>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold">Guest</h1>
            <p className="text-white/30 text-xs font-mono mt-0.5">Session #{shortId}</p>
          </div>
          <Link
            href="/tokens"
            className="border-primary/40 hover:bg-primary/10 flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold text-white transition-colors"
          >
            <span
              className="material-symbols-outlined text-primary text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            Upgrade to Premium
          </Link>
        </div>

        {/* Token balance card */}
        <div className="bg-surface-dark mx-4 mb-6 flex items-center justify-between rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 flex size-10 items-center justify-center rounded-full">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                token
              </span>
            </div>
            <div>
              <p className="text-white/40 text-xs font-medium">Current Balance</p>
              <p className="text-xl font-black">
                {profile?.tokenBalance ?? 0}{' '}
                <span className="text-white/40 text-sm font-bold">tokens</span>
              </p>
            </div>
          </div>
          <Link
            href="/tokens"
            className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f20da6, #b00b7a)' }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Top Up
          </Link>
        </div>

        {/* Quick links */}
        <div className="bg-surface-dark mx-4 mb-6 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
          {[
            { icon: 'queue_music', label: 'View Queue', href: '/queue' },
            { icon: 'library_music', label: 'Browse Songs', href: '/browse' },
            { icon: 'mic', label: 'Request a Song', href: '/request' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined text-white/40 text-[20px]">{item.icon}</span>
              <span className="text-sm font-semibold flex-1">{item.label}</span>
              <span className="material-symbols-outlined text-white/20 text-[16px]">chevron_right</span>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-white/20 mx-4">
          Your session is stored locally. Tokens reset if you clear browser data.
        </p>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
