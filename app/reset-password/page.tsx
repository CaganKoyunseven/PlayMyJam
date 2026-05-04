// app/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!ready) {
      setError('This link is invalid or has expired. Please request a new password reset.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/browse'), 2000);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-background-dark mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-white">
        <span className="material-symbols-outlined text-6xl text-green-400">check_circle</span>
        <h1 className="text-center text-2xl font-extrabold">Password updated!</h1>
        <p className="text-center text-sm text-white/40">Redirecting you...</p>
      </div>
    );
  }

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden text-white">
      <div className="flex items-center p-4 pb-2">
        <h2 className="flex-1 text-center text-lg leading-tight font-bold">Reset Password</h2>
      </div>

      <div className="px-6 pt-4 pb-2 text-center">
        <p className="text-sm text-white/40">Enter your new password below.</p>
      </div>

      <form
        className="flex w-full flex-col gap-5 px-6 py-6"
        onSubmit={handleSubmit}
      >
        <label className="flex flex-col gap-2">
          <span className="ml-1 text-sm font-semibold">New Password</span>
          <div className="group relative">
            <span className="material-symbols-outlined group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 text-white/40 transition-colors">
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="bg-surface-dark focus:ring-primary/50 flex h-14 w-full rounded-xl border-none pr-12 pl-12 text-base text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="hover:text-primary absolute top-1/2 right-4 -translate-y-1/2 text-white/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="ml-1 text-sm font-semibold">Confirm New Password</span>
          <div className="group relative">
            <span className="material-symbols-outlined group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 text-white/40 transition-colors">
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="bg-surface-dark focus:ring-primary/50 flex h-14 w-full rounded-xl pr-4 pl-12 text-base text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
            />
          </div>
        </label>

        {error && <p className="-mt-2 text-center text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #f20da6 0%, #b00b7a 100%)',
            boxShadow: '0 4px 20px rgba(242,13,166,0.3)',
          }}
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin">refresh</span>
          ) : (
            <>
              Update Password <span className="material-symbols-outlined text-[20px]">lock_reset</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
