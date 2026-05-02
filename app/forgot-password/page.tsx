'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background-dark text-white px-6 max-w-md mx-auto gap-6">
        <span className="material-symbols-outlined text-primary text-6xl">mark_email_read</span>
        <h1 className="text-2xl font-extrabold text-center">Check your email</h1>
        <p className="text-white/40 text-sm text-center">
          We sent a password reset link to{' '}
          <span className="text-white font-semibold">{email}</span>.
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
        <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-12">Forgot Password</h2>
      </div>

      <div className="px-6 pt-4 pb-2 text-center">
        <p className="text-white/40 text-sm">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form className="flex flex-col gap-5 px-6 py-6 w-full" onSubmit={handleSubmit}>
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
            <>Send Reset Link <span className="material-symbols-outlined text-[20px]">send</span></>
          )}
        </button>
      </form>
    </div>
  );
}
