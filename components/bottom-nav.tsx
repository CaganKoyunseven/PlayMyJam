import Link from 'next/link';

type NavItem = 'home' | 'browse' | 'queue' | 'tokens' | 'profile';

export default function BottomNav({ active }: { active: NavItem }) {
  const items: { id: NavItem; icon: string; label: string; href: string }[] = [
    { id: 'queue', icon: 'queue_music', label: 'Queue', href: '/queue' },
    { id: 'browse', icon: 'search', label: 'Browse', href: '/browse' },
    { id: 'tokens', icon: 'token', label: 'Tokens', href: '/tokens' },
    { id: 'profile', icon: 'person', label: 'Profile', href: '/profile' },
  ];

  return (
    <nav className="bg-surface-dark fixed right-0 bottom-0 left-0 z-50 mx-auto flex max-w-md items-center justify-between border-t border-white/5 px-6 py-3">
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
              isActive ? 'text-primary' : 'text-surface-muted hover:text-white'
            }`}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
