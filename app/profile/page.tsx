'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/bottom-nav';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

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
        .single()
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
    if (username.length < 3) { setUsernameStatus('too-short'); return; }

    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setUsernameStatus(data.available ? 'available' : 'taken');
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, savedUsername]);

  async function handleSaveUsername() {
    if (usernameStatus !== 'available') return;
    setSavingUsername(true);
    setUsernameError('');
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user!.id);
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
        <span className="material-symbols-outlined text-white/20 text-5xl animate-spin">refresh</span>
      </div>
    );
  }

  if (!user) return null;

  const usernameHint =
    usernameStatus === 'too-short' ? 'At least 3 characters required' :
    usernameStatus === 'checking' ? 'Checking...' :
    usernameStatus === 'available' ? '✓ Available' :
    usernameStatus === 'taken' ? '✗ Username already taken' :
    '';

  const usernameHintColor =
    usernameStatus === 'available' ? 'text-green-400' :
    usernameStatus === 'taken' ? 'text-red-400' :
    'text-white/40';

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
          <div className="border-primary/40 size-24 rounded-full border-4 bg-surface-dark flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white/30 text-4xl">person</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold">{savedUsername}</h1>
            <p className="text-white/30 text-xs mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Username */}
        <div className="bg-surface-dark mx-4 mb-4 rounded-xl border border-white/5 p-4 flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Username</p>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors text-[18px]">
                alternate_email
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full rounded-xl bg-background-dark text-white h-11 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={handleSaveUsername}
              disabled={usernameStatus !== 'available' || savingUsername}
              className="h-11 px-4 rounded-xl bg-primary text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
            >
              {savingUsername ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
              ) : 'Save'}
            </button>
          </div>
          {usernameHint && (
            <span className={`text-xs ${usernameHintColor}`}>{usernameHint}</span>
          )}
          {usernameError && <span className="text-xs text-red-400">{usernameError}</span>}
        </div>

        {/* Change Password */}
        <div className="bg-surface-dark mx-4 mb-4 rounded-xl border border-white/5 p-4 flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Change Password</p>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Show passwords</span>
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="text-white/40 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPasswords ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <input
              type={showPasswords ? 'text' : 'password'}
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-background-dark text-white h-11 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/30"
            />
            <input
              type={showPasswords ? 'text' : 'password'}
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-background-dark text-white h-11 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/30"
            />
            <input
              type={showPasswords ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-background-dark text-white h-11 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/30"
            />
            {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
            {passwordSuccess && <p className="text-xs text-green-400">Password updated successfully!</p>}
            <div className="flex justify-between items-center">
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot Password?
              </Link>
              <button
                type="submit"
                disabled={changingPassword}
                className="h-9 px-4 rounded-xl bg-primary text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
              >
                {changingPassword ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                ) : 'Update'}
              </button>
            </div>
          </form>
        </div>

        {/* Sign Out */}
        <div className="mx-4 mb-4">
          <button
            onClick={handleSignOut}
            className="w-full h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-red-500/20"
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
