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
    } = supabase.auth.onAuthStateChange((event) => {
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background-dark text-white px-6 max-w-md mx-auto gap-6">
        <span className="material-symbols-outlined text-green-400 text-6xl">check_circle</span>
        <h1 className="text-2xl font-extrabold text-center">Password updated!</h1>
        <p className="text-white/40 text-sm text-center">Redirecting you...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white max-w-md mx-auto">
      <div className="flex items-center p-4 pb-2">
        <h2 className="text-lg font-bold leading-tight flex-1 text-center">Reset Password</h2>
      </div>

      <div className="px-6 pt-4 pb-2 text-center">
        <p className="text-white/40 text-sm">Enter your new password below.</p>
      </div>

      <form className="flex flex-col gap-5 px-6 py-6 w-full" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold ml-1">New Password</span>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-12 text-base placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold ml-1">Confirm New Password</span>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-4 text-base placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/30"
            />
          </div>
        </label>

        {error && <p className="text-red-400 text-sm text-center -mt-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="h-14 w-full rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #f20da6 0%, #b00b7a 100%)',
            boxShadow: '0 4px 20px rgba(242,13,166,0.3)',
          }}
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin">refresh</span>
          ) : (
            <>Update Password <span className="material-symbols-outlined text-[20px]">lock_reset</span></>
          )}
        </button>
      </form>
    </div>
  );
}
