'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Tab = 'password' | 'magic';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('password');

  // Password tab state
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  // Magic link tab state
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState('');

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? 'Login failed');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });
      if (error) {
        setPwError(error.message);
        return;
      }
      router.push('/browse');
    } catch {
      setPwError('Something went wrong');
    } finally {
      setPwLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMagicError('');
    setMagicLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: magicEmail });
      if (error) {
        setMagicError(error.message);
        return;
      }
      setMagicSent(true);
    } catch {
      setMagicError('Something went wrong');
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white max-w-md mx-auto">
      <div className="flex items-center p-4 pb-2 justify-between">
        <button
          onClick={() => router.back()}
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-12">PlayMyJam</h2>
      </div>

      <div className="px-6 pt-4 pb-2 text-center">
        <h1 className="tracking-tight text-[32px] font-extrabold leading-tight mb-2">
          Let&apos;s get the{' '}
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(to right, #f20da6, #a855f7)' }}
          >
            party started
          </span>
        </h1>
        <p className="text-white/40 text-base font-normal leading-relaxed">
          Queue up your favorite tracks at your local venue.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-6 mt-6 p-1 bg-white/5 rounded-xl">
        {(['password', 'magic'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === t ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'
            }`}
          >
            {t === 'password' ? 'Password' : 'Magic Link'}
          </button>
        ))}
      </div>

      {tab === 'password' ? (
        <form className="flex flex-col gap-5 px-6 py-6 w-full" onSubmit={handlePasswordLogin}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold ml-1">Email or Username</span>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
                person
              </span>
              <input
                type="text"
                placeholder="email@example.com or username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-4 text-base placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <div className="flex justify-between items-center ml-1">
              <span className="text-sm font-semibold">Password</span>
              <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                Forgot Password?
              </Link>
            </div>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
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

          {pwError && <p className="text-red-400 text-sm text-center -mt-2">{pwError}</p>}

          <button
            type="submit"
            disabled={pwLoading}
            className="h-14 w-full rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #f20da6 0%, #b00b7a 100%)',
              boxShadow: '0 4px 20px rgba(242,13,166,0.3)',
            }}
          >
            {pwLoading ? (
              <span className="material-symbols-outlined animate-spin">refresh</span>
            ) : (
              <>Log In <span className="material-symbols-outlined text-[20px]">login</span></>
            )}
          </button>

          <p className="text-center text-sm text-white/40">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      ) : (
        <form className="flex flex-col gap-5 px-6 py-6 w-full" onSubmit={handleMagicLink}>
          {magicSent ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <span className="material-symbols-outlined text-primary text-5xl">mark_email_read</span>
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-white/40 text-sm">
                We sent a magic link to <span className="text-white font-semibold">{magicEmail}</span>.
                Click it to sign in.
              </p>
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold ml-1">Email</span>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors">
                    mail
                  </span>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    required
                    className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-4 text-base placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
                  />
                </div>
              </label>

              {magicError && <p className="text-red-400 text-sm text-center -mt-2">{magicError}</p>}

              <button
                type="submit"
                disabled={magicLoading}
                className="h-14 w-full rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #f20da6 0%, #b00b7a 100%)',
                  boxShadow: '0 4px 20px rgba(242,13,166,0.3)',
                }}
              >
                {magicLoading ? (
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                ) : (
                  <>Send Magic Link <span className="material-symbols-outlined text-[20px]">send</span></>
                )}
              </button>

              <p className="text-center text-sm text-white/40">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary font-bold hover:underline">
                  Sign up
                </Link>
              </p>
            </>
          )}
        </form>
      )}
    </div>
  );
}
