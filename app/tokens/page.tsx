import BottomNav from '@/components/bottom-nav';
import { tokenPackages } from '@/lib/mock-data';

export default function TokensPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between p-4 pb-2 bg-background-dark/80 backdrop-blur-md border-b border-white/5">
        <button className="flex size-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Store</h2>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-28">

        {/* Premium Banner */}
        <div className="relative overflow-hidden rounded-xl shadow-lg">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&fit=crop')" }}
          />
          <div
            className="relative flex flex-col p-6 items-start gap-4"
            style={{ background: 'linear-gradient(to right, #2563eb, #7c3aed)' }}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-yellow-300"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <p className="text-white text-xs font-bold uppercase tracking-wider">
                  PlayMyJam Premium
                </p>
              </div>
              <h2 className="text-white text-2xl font-extrabold leading-tight">
                Unlock Unlimited Vibes
              </h2>
              <p className="text-blue-100 text-sm font-medium leading-relaxed max-w-[280px]">
                Skip the queue, get unlimited requests, and enjoy ad-free jamming at any venue.
              </p>
            </div>
            <button className="bg-white text-blue-700 hover:bg-blue-50 font-bold py-3 px-6 rounded-full shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2">
              <span>Subscribe Now</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Token Packages */}
        <div>
          <h2 className="text-white text-xl font-bold mb-4">Buy Tokens</h2>
          <div className="flex flex-col gap-4">
            {tokenPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col gap-4 rounded-xl p-5 shadow-sm transition-all ${
                  pkg.popular
                    ? 'border-2 border-primary bg-surface-dark shadow-[0_0_15px_rgba(242,13,166,0.15)]'
                    : 'border border-white/10 bg-surface-dark hover:border-primary/40'
                }`}
              >
                {/* Most Popular badge */}
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                {/* Title row */}
                <div className={`flex justify-between items-start ${pkg.popular ? 'pt-2' : ''}`}>
                  <div className="flex flex-col">
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${
                      pkg.id === 'king' ? 'text-purple-400' : pkg.popular ? 'text-primary' : 'text-slate-400'
                    }`}>
                      {pkg.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`font-black tracking-tight text-white ${pkg.popular ? 'text-4xl' : 'text-3xl'}`}>
                        {pkg.price}
                      </span>
                      <span className="text-slate-400 text-sm font-bold">/ {pkg.tokens} tokens</span>
                    </div>
                  </div>
                  <div className={`size-10 rounded-full flex items-center justify-center ${pkg.iconBg} ${pkg.iconColor}`}>
                    <span
                      className="material-symbols-outlined"
                      style={pkg.popular ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {pkg.icon}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 py-1">
                  {pkg.features.map((f, i) => (
                    <div key={i} className={`flex items-center gap-3 text-sm ${f.included ? 'text-slate-300' : 'text-slate-500 line-through decoration-slate-500/50'}`}>
                      <span className={`material-symbols-outlined text-[20px] ${
                        f.included
                          ? pkg.popular ? 'text-primary' : 'text-green-500'
                          : 'text-slate-600'
                      }`}>
                        {f.included ? 'check_circle' : 'cancel'}
                      </span>
                      <span className={f.included && pkg.popular ? 'font-medium text-white' : ''}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  className={`mt-auto w-full py-3 font-bold rounded-lg transition-all active:scale-95 ${
                    pkg.popular
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {pkg.popular ? 'Buy Now' : 'Buy'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="pb-4">
          <h3 className="text-white text-base font-bold mb-3">Payment Methods</h3>
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            {/* Mastercard */}
            <div className="h-12 w-20 flex-shrink-0 bg-surface-dark border border-white/10 rounded-lg flex items-center justify-center shadow-sm">
              <div className="flex items-center gap-0.5">
                <div className="w-6 h-6 rounded-full bg-red-500 opacity-90" />
                <div className="w-6 h-6 rounded-full bg-yellow-400 opacity-90 -ml-3" />
              </div>
            </div>
            {/* Visa */}
            <div className="h-12 w-20 flex-shrink-0 bg-surface-dark border border-white/10 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-blue-400 font-black text-lg italic tracking-tight">VISA</span>
            </div>
            {/* Wallet Pay */}
            <div className="h-12 w-20 flex-shrink-0 bg-surface-dark border border-white/10 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                Pay
              </span>
            </div>
            {/* Add new */}
            <button className="h-12 w-12 flex-shrink-0 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-slate-400">add</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            Transactions are secured and encrypted.
          </p>
        </div>
      </div>

      <BottomNav active="tokens" />
    </div>
  );
}
