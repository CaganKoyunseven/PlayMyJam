'use client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white max-w-md mx-auto">
      {/* Top Bar */}
      <div className="flex items-center p-4 pb-2 justify-between z-10">
        <button className="flex size-12 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-12">
          PlayMyJam
        </h2>
      </div>

      {/* Hero Image */}
      <div className="w-full px-0">
        <div
          className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden min-h-[240px] relative"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=480&h=240&fit=crop')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent" />
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: '#f20da6', mixBlendMode: 'overlay' as const }}
          />
        </div>
      </div>

      {/* Header Text */}
      <div className="px-6 pt-4 pb-2 text-center">
        <h1 className="tracking-tight text-[32px] font-extrabold leading-tight mb-2">
          Let&apos;s get the{' '}
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(to right, #f20da6, #a855f7)',
            }}
          >
            party started
          </span>
        </h1>
        <p className="text-surface-muted text-base font-normal leading-relaxed">
          Queue up your favorite tracks and vote for what plays next at your
          local venue.
        </p>
      </div>

      {/* Form */}
      <form className="flex flex-col gap-5 px-6 py-6 w-full" onSubmit={(e) => { e.preventDefault(); router.push('/queue'); }}>
        {/* Email */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold ml-1">Email</span>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-surface-muted group-focus-within:text-primary transition-colors">
              mail
            </span>
            <input
              type="email"
              placeholder="hello@example.com"
              className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-4 text-base placeholder:text-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
            />
          </div>
        </label>

        {/* Password */}
        <label className="flex flex-col gap-2">
          <div className="flex justify-between items-center ml-1">
            <span className="text-sm font-semibold">Password</span>
            <a href="#" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              Forgot Password?
            </a>
          </div>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-surface-muted group-focus-within:text-primary transition-colors">
              lock
            </span>
            <input
              type="password"
              placeholder="Enter your password"
              className="flex w-full rounded-xl text-white bg-surface-dark h-14 pl-12 pr-12 text-base placeholder:text-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/50 border-none"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-muted hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">visibility</span>
            </button>
          </div>
        </label>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            type="submit"
            className="h-14 w-full rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #f20da6 0%, #b00b7a 100%)',
              boxShadow: '0 4px 20px rgba(242,13,166,0.3)',
            }}
          >
            Log In
            <span className="material-symbols-outlined text-[20px]">login</span>
          </button>
          <button
            type="button"
            className="h-14 w-full rounded-xl bg-transparent border-2 border-surface-dark text-white font-bold text-lg hover:bg-surface-dark hover:border-primary/30 active:scale-[0.98] transition-all duration-200"
          >
            Sign Up
          </button>
        </div>
      </form>

      {/* Social Login */}
      <div className="px-6 pb-8">
        <div className="relative py-2 flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative bg-background-dark px-4 text-xs uppercase text-surface-muted font-bold tracking-wider">
            Or login with
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button className="h-14 flex items-center justify-center gap-3 rounded-xl bg-surface-dark text-white font-semibold hover:bg-[#4a3543] transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Google</span>
          </button>
          <button className="h-14 flex items-center justify-center gap-3 rounded-xl bg-surface-dark text-white font-semibold hover:bg-[#4a3543] transition-colors">
            <span className="material-symbols-outlined text-[24px]">phone_iphone</span>
            <span>Apple</span>
          </button>
        </div>
      </div>
    </div>
  );
}
