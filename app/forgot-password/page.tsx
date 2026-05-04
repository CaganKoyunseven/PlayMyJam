'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-background-dark mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-white">
        <span className="material-symbols-outlined text-primary text-6xl">mark_email_read</span>
        <h1 className="text-center text-2xl font-extrabold">Check your email</h1>
        <p className="text-center text-sm text-white/40">
          We sent a password reset link to <span className="font-semibold text-white">{email}</span>.
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
        <h2 className="flex-1 pr-12 text-center text-lg leading-tight font-bold">Forgot Password</h2>
      </div>

      <div className="px-6 pt-4 pb-2 text-center">
        <p className="text-sm text-white/40">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <form
        className="flex w-full flex-col gap-5 px-6 py-6"
        onSubmit={handleSubmit}
      >
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
              Send Reset Link <span className="material-symbols-outlined text-[20px]">send</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
