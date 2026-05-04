'use client';

import { useState, useEffect, useRef } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import BottomNav from '@/components/bottom-nav';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'too-short' | 'unchanged';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.username) {
            setUsername(data.username);
            setSavedUsername(data.username);
          }
        });
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username || username === savedUsername) {
      setUsernameStatus(username === savedUsername ? 'unchanged' : 'idle');
      return;
    }
    if (username.length < 3) {
      setUsernameStatus('too-short');
      return;
    }

    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setUsernameStatus(data.available ? 'available' : 'taken');
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, savedUsername]);

  async function handleSaveUsername() {
    if (usernameStatus !== 'available') return;
    setSavingUsername(true);
    setUsernameError('');
    const { error } = await supabase.from('profiles').update({ username }).eq('id', user!.id);
    if (error) {
      setUsernameError(error.message);
    } else {
      setSavedUsername(username);
      setUsernameStatus('unchanged');
    }
    setSavingUsername(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });
      if (verifyError) {
        setPasswordError('Current password is incorrect');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setPasswordError(updateError.message);
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('Something went wrong');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="bg-background-dark flex min-h-screen items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-5xl text-white/20">refresh</span>
      </div>
    );
  }

  if (!user) return null;

  const usernameHint =
    usernameStatus === 'too-short'
      ? 'At least 3 characters required'
      : usernameStatus === 'checking'
        ? 'Checking...'
        : usernameStatus === 'available'
          ? '✓ Available'
          : usernameStatus === 'taken'
            ? '✗ Username already taken'
            : '';

  const usernameHintColor = usernameStatus === 'available' ? 'text-green-400' : usernameStatus === 'taken' ? 'text-red-400' : 'text-white/40';

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="bg-background-dark/80 sticky top-0 z-50 flex items-center justify-between border-b border-white/5 p-4 pb-2 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="flex-1 pr-10 text-center text-lg font-bold">Profile</h2>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4">
          <div className="border-primary/40 bg-surface-dark flex size-24 items-center justify-center rounded-full border-4 shadow-lg">
            <span className="material-symbols-outlined text-4xl text-white/30">person</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold">{savedUsername}</h1>
            <p className="mt-0.5 text-xs text-white/30">{user.email}</p>
          </div>
        </div>

        {/* Username */}
        <div className="bg-surface-dark mx-4 mb-4 flex flex-col gap-3 rounded-xl border border-white/5 p-4">
          <p className="text-xs font-bold tracking-wider text-white/40 uppercase">Username</p>
          <div className="flex items-center gap-2">
            <div className="group relative flex-1">
              <span className="material-symbols-outlined group-focus-within:text-primary absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-white/40 transition-colors">
                alternate_email
              </span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="bg-background-dark focus:ring-primary/50 h-11 w-full rounded-xl pr-3 pl-10 text-sm text-white focus:ring-2 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSaveUsername}
              disabled={usernameStatus !== 'available' || savingUsername}
              className="bg-primary h-11 rounded-xl px-4 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
            >
              {savingUsername ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : 'Save'}
            </button>
          </div>
          {usernameHint && <span className={`text-xs ${usernameHintColor}`}>{usernameHint}</span>}
          {usernameError && <span className="text-xs text-red-400">{usernameError}</span>}
        </div>

        {/* Change Password */}
        <div className="bg-surface-dark mx-4 mb-4 flex flex-col gap-3 rounded-xl border border-white/5 p-4">
          <p className="text-xs font-bold tracking-wider text-white/40 uppercase">Change Password</p>
          <form
            onSubmit={handleChangePassword}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Show passwords</span>
              <button
                type="button"
                onClick={() => setShowPasswords(v => !v)}
                className="hover:text-primary text-white/40 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">{showPasswords ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            <input
              type={showPasswords ? 'text' : 'password'}
              placeholder="Current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              className="bg-background-dark focus:ring-primary/50 h-11 w-full rounded-xl px-4 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
            />
            <input
              type={showPasswords ? 'text' : 'password'}
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              className="bg-background-dark focus:ring-primary/50 h-11 w-full rounded-xl px-4 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
            />
            <input
              type={showPasswords ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="bg-background-dark focus:ring-primary/50 h-11 w-full rounded-xl px-4 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
            />
            {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
            {passwordSuccess && <p className="text-xs text-green-400">Password updated successfully!</p>}
            <div className="flex items-center justify-between">
              <Link
                href="/forgot-password"
                className="text-primary text-xs hover:underline"
              >
                Forgot Password?
              </Link>
              <button
                type="submit"
                disabled={changingPassword}
                className="bg-primary h-9 rounded-xl px-4 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
              >
                {changingPassword ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : 'Update'}
              </button>
            </div>
          </form>
        </div>

        {/* Sign Out */}
        <div className="mx-4 mb-4">
          <button
            onClick={handleSignOut}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-sm font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
