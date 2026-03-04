'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MobilNavItem = {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
};

const navItems: MobilNavItem[] = [
  { href: '/', label: 'Ana', icon: '\u{1F3E0}' },
  { href: '/harita', label: 'Harita', icon: '\u{1F5FA}\uFE0F' },
  { href: '/ilanlar', label: 'Ilanlar', icon: '\u{1F4CB}' },
  { href: '/mesajlar', label: 'Mesaj', icon: '\u{1F4AC}', disabled: true },
  { href: '/profil', label: 'Profil', icon: '\u{1F464}' },
];

const getAktif = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-green-950/95 backdrop-blur-md md:hidden">
      {navItems.map((item) => {
        const aktif = getAktif(pathname, item.href);

        if (item.disabled) {
          return (
            <button
              key={item.href}
              type="button"
              disabled
              className="flex flex-1 cursor-not-allowed flex-col items-center justify-center gap-1 py-2 text-white/30"
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-[11px] font-semibold">{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 transition ${
              aktif ? 'text-green-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-[11px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
