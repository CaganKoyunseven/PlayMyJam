'use client';

import { useRouter } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import { tokenPackages } from '@/lib/mock-data';

export default function TokensPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark max-w-md mx-auto">
      <header className="sticky top-0 z-50 flex items-center justify-between p-4 pb-2 bg-background-dark/80 backdrop-blur-md border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Token Satın Al</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        <p className="text-sm text-slate-400 text-center">
          Her token ile bir şarkıyı kuyruğa ekleyebilirsin.
        </p>

        <div className="flex flex-col gap-4 mt-2">
          {tokenPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative flex flex-col gap-4 rounded-2xl p-5 transition-all ${
                pkg.popular
                  ? 'border-2 border-primary bg-surface-dark shadow-[0_0_15px_rgba(242,13,166,0.15)]'
                  : 'border border-white/10 bg-surface-dark'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                  En Avantajlı
                </div>
              )}

              <div className={`flex justify-between items-center ${pkg.popular ? 'pt-2' : ''}`}>
                <div className="flex flex-col gap-1">
                  <p className={`text-xs font-bold uppercase tracking-wider ${pkg.popular ? 'text-primary' : 'text-slate-400'}`}>
                    {pkg.name}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-black text-white ${pkg.popular ? 'text-4xl' : 'text-3xl'}`}>
                      {pkg.price}
                    </span>
                    <span className="text-slate-400 text-sm">/ {pkg.tokens} token</span>
                  </div>
                </div>
                <div className={`size-12 rounded-full flex items-center justify-center ${pkg.iconBg} ${pkg.iconColor}`}>
                  <span className="material-symbols-outlined text-[24px]" style={pkg.popular ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {pkg.icon}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {pkg.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className={`material-symbols-outlined text-[18px] ${pkg.popular ? 'text-primary' : 'text-green-500'}`}>
                      check_circle
                    </span>
                    {f.text}
                  </div>
                ))}
              </div>

              <button
                className={`w-full py-3 font-bold rounded-xl transition-all active:scale-95 ${
                  pkg.popular
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Satın Al
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 text-center pt-2">
          Ödemeler güvenli ve şifreli olarak işlenir.
        </p>
      </div>

      <BottomNav active="tokens" />
    </div>
  );
}
