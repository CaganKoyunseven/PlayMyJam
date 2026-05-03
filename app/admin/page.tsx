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
    <div className="flex min-h-screen items-center justify-center bg-background-dark px-6">
      <div className="flex flex-col gap-8 w-full max-w-xs">

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="size-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-primary text-3xl">admin_panel_settings</span>
          </div>
          <h1 className="text-2xl font-black">Admin Login</h1>
          <p className="text-sm text-slate-400">Sign in to manage the venue</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</label>
            <div className="flex h-12 items-center gap-3 rounded-2xl bg-white/5 border border-white/5 px-4 focus-within:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-white/30 text-[20px]">person</span>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                placeholder="Enter username"
                autoComplete="username"
                className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="flex h-12 items-center gap-3 rounded-2xl bg-white/5 border border-white/5 px-4 focus-within:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-white/30 text-[20px]">lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Enter password"
                autoComplete="current-password"
                className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <span className="material-symbols-outlined text-red-400 text-[16px]">error</span>
              <p className="text-xs text-red-400 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="flex h-12 items-center justify-center rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #f20da6, #9333ea)' }}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
