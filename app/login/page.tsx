'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

  async function handlePasswordLogin(e: React.SyntheticEvent) {
    e.preventDefault();
    setPwError('');
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? 'Login failed');
        return;
      }
      const { error } = await supabase.auth.setSession(data.session);
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

  async function handleMagicLink(e: React.SyntheticEvent) {
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

  function handleTabSwitch(t: Tab) {
    setPwError('');
    setMagicError('');
    setMagicSent(false);
    setTab(t);
  }

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden text-white">
      <div className="flex items-center justify-between p-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="flex-1 pr-12 text-center text-lg leading-tight font-bold">PlayMyJam</h2>
      </div>

      <div className="px-6 pt-4 pb-2 text-center">
        <h1 className="mb-2 text-[32px] leading-tight font-extrabold tracking-tight">
          Let&apos;s get the{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, #f20da6, #a855f7)' }}
          >
            party started
          </span>
        </h1>
        <p className="text-base leading-relaxed font-normal text-white/40">Queue up your favorite tracks at your local venue.</p>
      </div>

      {/* Tabs */}
      <div className="mx-6 mt-6 flex gap-1 rounded-xl bg-white/5 p-1">
        {(['password', 'magic'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => handleTabSwitch(t)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
              tab === t ? 'bg-primary text-white shadow-lg' : 'text-white/50 hover:text-white'
            }`}
          >
            {t === 'password' ? 'Password' : 'Magic Link'}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 px-6 pt-5 pb-1">
        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs font-medium text-white/30">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <Link
          href="/browse"
          className="text-sm font-medium text-white/40 transition-colors hover:text-white/70"
        >
          Continue as guest
        </Link>
      </div>

      {tab === 'password' ? (
        <form
          className="flex w-full flex-col gap-5 px-6 py-6"
          onSubmit={handlePasswordLogin}
        >
          <label className="flex flex-col gap-2">
            <span className="ml-1 text-sm font-semibold">Email or Username</span>
            <div className="group relative">
              <span className="material-symbols-outlined group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 text-white/40 transition-colors">
                person
              </span>
              <input
                type="text"
                placeholder="email@example.com or username"
                value={login}
                onChange={e => setLogin(e.target.value)}
                required
                className="bg-surface-dark focus:ring-primary/50 flex h-14 w-full rounded-xl border-none pr-4 pl-12 text-base text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <div className="ml-1 flex items-center justify-between">
              <span className="text-sm font-semibold">Password</span>
              <Link
                href="/forgot-password"
                className="text-primary hover:text-primary/80 text-xs font-semibold transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="group relative">
              <span className="material-symbols-outlined group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 text-white/40 transition-colors">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
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

          {pwError && <p className="-mt-2 text-center text-sm text-red-400">{pwError}</p>}

          <button
            type="submit"
            disabled={pwLoading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #f20da6 0%, #b00b7a 100%)',
              boxShadow: '0 4px 20px rgba(242,13,166,0.3)',
            }}
          >
            {pwLoading ? (
              <span className="material-symbols-outlined animate-spin">refresh</span>
            ) : (
              <>
                Log In <span className="material-symbols-outlined text-[20px]">login</span>
              </>
            )}
          </button>

          <p className="text-center text-sm text-white/40">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-primary font-bold hover:underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      ) : (
        <form
          className="flex w-full flex-col gap-5 px-6 py-6"
          onSubmit={handleMagicLink}
        >
          {magicSent ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <span className="material-symbols-outlined text-primary text-5xl">mark_email_read</span>
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-sm text-white/40">
                We sent a magic link to <span className="font-semibold text-white">{magicEmail}</span>. Click it to sign in.
              </p>
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-2">
                <span className="ml-1 text-sm font-semibold">Email</span>
                <div className="group relative">
                  <span className="material-symbols-outlined group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 text-white/40 transition-colors">
                    mail
                  </span>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={magicEmail}
                    onChange={e => setMagicEmail(e.target.value)}
                    required
                    className="bg-surface-dark focus:ring-primary/50 flex h-14 w-full rounded-xl border-none pr-4 pl-12 text-base text-white placeholder:text-white/30 focus:ring-2 focus:outline-none"
                  />
                </div>
              </label>

              {magicError && <p className="-mt-2 text-center text-sm text-red-400">{magicError}</p>}

              <button
                type="submit"
                disabled={magicLoading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #f20da6 0%, #b00b7a 100%)',
                  boxShadow: '0 4px 20px rgba(242,13,166,0.3)',
                }}
              >
                {magicLoading ? (
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                ) : (
                  <>
                    Send Magic Link <span className="material-symbols-outlined text-[20px]">send</span>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-white/40">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="text-primary font-bold hover:underline"
                >
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
