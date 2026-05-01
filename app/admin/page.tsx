'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? '1234';
const SESSION_KEY = 'pmj_admin_auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function handleDigit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        sessionStorage.setItem(SESSION_KEY, '1');
        router.push('/admin/dashboard');
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => { setPin(''); setShake(false); }, 600);
      }
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
    setError(false);
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-dark px-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="size-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-primary text-3xl">admin_panel_settings</span>
          </div>
          <h1 className="text-2xl font-black">Admin Access</h1>
          <p className="text-sm text-slate-400">Enter your 4-digit PIN</p>
        </div>

        {/* Dot indicators */}
        <div className={`flex gap-4 transition-all ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`size-4 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? error ? 'bg-red-500' : 'bg-primary'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 font-medium -mt-4">Incorrect PIN</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'del') {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  className="flex h-16 items-center justify-center rounded-2xl bg-white/5 text-white/60 active:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">backspace</span>
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                className="flex h-16 items-center justify-center rounded-2xl bg-white/5 text-xl font-bold text-white active:bg-primary/20 active:text-primary transition-colors"
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
