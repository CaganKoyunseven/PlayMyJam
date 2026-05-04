'use client';

import { useState } from 'react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok) {
        window.location.href = '/admin/dashboard';
      } else {
        const data = await res.json();
        setError(data.error ?? 'Login failed');
      }
    } catch {
      setError('Connection error, try again');
    }

    setLoading(false);
  }

  return (
    <div className="bg-background-dark flex min-h-screen items-center justify-center px-6">
      <div className="flex w-full max-w-xs flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="bg-primary/20 mb-2 flex size-16 items-center justify-center rounded-2xl">
            <span className="material-symbols-outlined text-primary text-3xl">admin_panel_settings</span>
          </div>
          <h1 className="text-2xl font-black">Admin Login</h1>
          <p className="text-sm text-slate-400">Sign in to manage the venue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Username</label>
            <div className="focus-within:border-primary/50 flex h-12 items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 transition-colors">
              <span className="material-symbols-outlined text-[20px] text-white/30">person</span>
              <input
                type="text"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="Enter username"
                autoComplete="username"
                className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Password</label>
            <div className="focus-within:border-primary/50 flex h-12 items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 transition-colors">
              <span className="material-symbols-outlined text-[20px] text-white/30">lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter password"
                autoComplete="current-password"
                className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="text-white/30 transition-colors hover:text-white/60"
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <span className="material-symbols-outlined text-[16px] text-red-400">error</span>
              <p className="text-xs font-medium text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="flex h-12 items-center justify-center rounded-2xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #f20da6, #9333ea)' }}
          >
            {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
