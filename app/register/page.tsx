'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    if (!username) { setUsernameStatus('idle'); return; }
    if (username.length < 3) { setUsernameStatus('too-short'); return; }

    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setUsernameStatus(data.available ? 'available' : 'taken');
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
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
        options: { data: { username } },
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
    usernameStatus === 'too-short' ? 'At least 3 characters required' :
    usernameStatus === 'checking' ? 'Checking...' :
    usernameStatus === 'available' ? '✓ Available' :
    usernameStatus === 'taken' ? '✗ Username already taken' :
    '';

  const usernameHintColor =
    usernameStatus === 'available' ? 'text-green-400' :
    usernameStatus === 'taken' ? 'text-red-400' :
    'text-white/40';

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background-dark text-white px-6 max-w-md mx-auto gap-6">
        <span className="material-symbols-outlined text-primary text-6xl">mark_email_read</span>
        <h1 className="text-2xl font-extrabold text-center">Check your email</h1>
        <p className="text-white/40 text-sm text-center">
          We sent a confirmation link to <span className="text-white font-semibold">{email}</span>.
          Click it to activate your account.
        </p>
        <Link href="/login" className="text-primary font-bold hover:underline">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white max-w-md mx-auto">
      <div className="flex items-center p-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-12">Create Account</h2>
      </div>

      <form className="flex flex-col gap-5 px-6 py-6 w-full" onSubmit={handleSubmit}>
        {/* Username */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold ml-1">Username</span>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
              alternate_email
            </span>
            <input
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
              className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-4 text-base placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
            />
          </div>
          {usernameHint && (
            <span className={`text-xs ml-1 ${usernameHintColor}`}>{usernameHint}</span>
          )}
        </label>

        {/* Email */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold ml-1">Email</span>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
              mail
            </span>
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-4 text-base placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
            />
          </div>
        </label>

        {/* Password */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold ml-1">Password</span>
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

        {/* Confirm password */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold ml-1">Confirm Password</span>
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
              className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-4 text-base placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
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
            <>Create Account <span className="material-symbols-outlined text-[20px]">person_add</span></>
          )}
        </button>

        <p className="text-center text-sm text-white/40">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
