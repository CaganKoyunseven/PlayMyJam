'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/bottom-nav';
import { getUserProfile, UserProfile } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="bg-background-dark flex min-h-screen items-center justify-center">
        <span className="material-symbols-outlined text-white/20 text-5xl animate-spin">refresh</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-white/20 text-6xl">person_off</span>
        <p className="text-white/40 text-sm">Sign in to view your profile</p>
        <Link
          href="/login"
          className="rounded-xl px-6 py-3 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #f20da6, #b00b7a)' }}
        >
          Sign In
        </Link>
        <BottomNav active="profile" />
      </div>
    );
  }

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="bg-background-dark/80 sticky top-0 z-50 flex items-center justify-between border-b border-white/5 p-4 pb-2 backdrop-blur-md">
        <button className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="flex-1 pr-10 text-center text-lg font-bold">Profile</h2>
        <button className="flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4">
          <div className="relative">
            <div
              className="border-primary/40 size-24 rounded-full border-4 bg-cover bg-center shadow-lg bg-surface-dark"
              style={profile.avatarUrl ? { backgroundImage: `url('${profile.avatarUrl}')` } : {}}
            />
            {profile.isPremium && (
              <div className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-yellow-400 shadow">
                <span
                  className="material-symbols-outlined text-[16px] text-yellow-900"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              </div>
            )}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold">{profile.displayName ?? 'User'}</h1>
            {profile.username && <p className="text-surface-muted text-sm">@{profile.username}</p>}
          </div>
          {!profile.isPremium && (
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
          )}
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-3 gap-3 px-4">
          {[
            { label: 'Tokens', value: profile.tokens, icon: 'token', color: 'text-primary' },
            { label: 'Requests', value: profile.totalRequests, icon: 'queue_music', color: 'text-blue-400' },
            { label: 'Added', value: profile.songsAdded, icon: 'library_music', color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-dark flex flex-col items-center gap-1 rounded-xl p-4">
              <span
                className={`material-symbols-outlined ${stat.color}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {stat.icon}
              </span>
              <span className="text-2xl font-black">{stat.value}</span>
              <span className="text-surface-muted text-xs font-medium">{stat.label}</span>
            </div>
          ))}
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
              <p className="text-surface-muted text-xs font-medium">Current Balance</p>
              <p className="text-xl font-black">
                {profile.tokens} <span className="text-surface-muted text-sm font-bold">tokens</span>
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

        {/* Info rows */}
        <div className="bg-surface-dark mx-4 mb-6 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
          {[
            { icon: 'location_on', label: 'Favorite Venue', value: profile.favoriteVenue ?? '—' },
            { icon: 'calendar_month', label: 'Member Since', value: profile.memberSince },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4 px-4 py-3">
              <span className="material-symbols-outlined text-surface-muted text-[20px]">{item.icon}</span>
              <div className="flex-1">
                <p className="text-surface-muted text-xs">{item.label}</p>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Log out */}
        <div className="mx-4 mb-4">
          <button
            onClick={handleLogout}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-semibold text-slate-400 transition-colors hover:border-white/20 hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Log Out
          </button>
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
