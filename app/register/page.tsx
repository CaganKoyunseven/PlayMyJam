'use client';

import { useState, useEffect, useRef } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'too-short';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username) {
      setUsernameStatus('idle');
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
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (usernameStatus !== 'available') {
      setError('Please choose an available username (min 3 characters)');
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
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/queue`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setSuccess(true);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

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

  if (success) {
    return (
      <div className="bg-background-dark mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-white">
        <span className="material-symbols-outlined text-primary text-6xl">mark_email_read</span>
        <h1 className="text-center text-2xl font-extrabold">Check your email</h1>
        <p className="text-center text-sm text-white/40">
          We sent a confirmation link to <span className="font-semibold text-white">{email}</span>. Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="text-primary font-bold hover:underline"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden text-white">
      <div className="flex items-center p-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="flex-1 pr-12 text-center text-lg leading-tight font-bold">Create Account</h2>
      </div>

      <form
        className="flex w-full flex-col gap-5 px-6 py-6"
        onSubmit={handleSubmit}
      >
        {/* Username */}
        <label className="flex flex-col gap-2">
          <span className="ml-1 text-sm font-semibold">Username</span>
          <div className="group relative">
            <span className="material-symbols-outlined group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 text-white/40 transition-colors">
              alternate_email
            </span>
            <input
              type="text"
              placeholder="your_username"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
              className="bg-surface-dark focus:ring-primary/50 flex h-14 w-full rounded-xl border-none pr-4 pl-12 text-base text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
            />
          </div>
          {usernameHint && <span className={`ml-1 text-xs ${usernameHintColor}`}>{usernameHint}</span>}
        </label>

        {/* Email */}
        <label className="flex flex-col gap-2">
          <span className="ml-1 text-sm font-semibold">Email</span>
          <div className="group relative">
            <span className="material-symbols-outlined group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 text-white/40 transition-colors">
              mail
            </span>
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-surface-dark focus:ring-primary/50 flex h-14 w-full rounded-xl border-none pr-4 pl-12 text-base text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
            />
          </div>
        </label>

        {/* Password */}
        <label className="flex flex-col gap-2">
          <span className="ml-1 text-sm font-semibold">Password</span>
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

        {/* Confirm password */}
        <label className="flex flex-col gap-2">
          <span className="ml-1 text-sm font-semibold">Confirm Password</span>
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
              className="bg-surface-dark focus:ring-primary/50 flex h-14 w-full rounded-xl border-none pr-4 pl-12 text-base text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
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
              Create Account <span className="material-symbols-outlined text-[20px]">person_add</span>
            </>
          )}
        </button>

        <p className="text-center text-sm text-white/40">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary font-bold hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
