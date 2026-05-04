'use client';

import { useRouter } from 'next/navigation';

import BottomNav from '@/components/bottom-nav';
import { tokenPackages } from '@/lib/mock-data';

export default function TokensPage() {
  const router = useRouter();

  return (
    <div className="bg-background-dark relative mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="bg-background-dark/80 sticky top-0 z-50 flex items-center justify-between border-b border-white/5 p-4 pb-2 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="flex-1 pr-10 text-center text-lg font-bold">Buy Tokens</h2>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
        <p className="text-center text-sm text-slate-400">Each token lets you add a song to the queue.</p>

        <div className="mt-2 flex flex-col gap-4">
          {tokenPackages.map(pkg => (
            <div
              key={pkg.id}
              className={`relative flex flex-col gap-4 rounded-2xl p-5 transition-all ${
                pkg.popular ? 'border-primary bg-surface-dark border-2 shadow-[0_0_15px_rgba(242,13,166,0.15)]' : 'bg-surface-dark border border-white/10'
              }`}
            >
              {pkg.popular && (
                <div className="bg-primary absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest whitespace-nowrap text-white uppercase">
                  Best Value
                </div>
              )}

              <div className={`flex items-center justify-between ${pkg.popular ? 'pt-2' : ''}`}>
                <div className="flex flex-col gap-1">
                  <p className={`text-xs font-bold tracking-wider uppercase ${pkg.popular ? 'text-primary' : 'text-slate-400'}`}>{pkg.name}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-black text-white ${pkg.popular ? 'text-4xl' : 'text-3xl'}`}>{pkg.price}</span>
                    <span className="text-sm text-slate-400">/ {pkg.tokens} token</span>
                  </div>
                </div>
                <div className={`flex size-12 items-center justify-center rounded-full ${pkg.iconBg} ${pkg.iconColor}`}>
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={pkg.popular ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {pkg.icon}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {pkg.features.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${pkg.popular ? 'text-primary' : 'text-green-500'}`}>check_circle</span>
                    {f.text}
                  </div>
                ))}
              </div>

              <button
                className={`w-full rounded-xl py-3 font-bold transition-all active:scale-95 ${
                  pkg.popular ? 'bg-primary shadow-primary/25 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>

        <p className="pt-2 text-center text-xs text-slate-500">Payments are processed securely and encrypted.</p>
      </div>

      <BottomNav active="tokens" />
    </div>
  );
}
