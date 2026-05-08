'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const ITEMS = [
  { href: '/',         icon: '🏠', label: 'Today',   enabled: true  },
  { href: '/stories',  icon: '📖', label: 'Stories', enabled: true  },
  { href: '/family',   icon: '👪', label: 'Family',  enabled: true  },
  { href: '/memoir',   icon: '📕', label: 'Memoir',  enabled: false },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-deep-navy/10">
      <div className="max-w-xl mx-auto grid grid-cols-4">
        {ITEMS.map((it) => {
          const active = it.enabled && pathname === it.href;
          const Tag = it.enabled ? Link : 'span';
          return (
            <Tag
              key={it.href}
              href={it.enabled ? it.href : '#'}
              className={clsx(
                'flex flex-col items-center gap-1 py-3 text-sm min-h-touch-target',
                active ? 'text-soft-coral' : 'text-deep-navy',
                !it.enabled && 'opacity-30',
              )}
            >
              <span className="text-xl">{it.icon}</span>
              {it.label}
            </Tag>
          );
        })}
      </div>
    </nav>
  );
}
