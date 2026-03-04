'use client';

import Link from 'next/link';

type AppNavbarProps = {
  onToggle: () => void;
};

export default function AppNavbar({ onToggle }: AppNavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-green-950/90 backdrop-blur-md md:hidden">
      <div className="mx-auto flex h-14 max-h-14 items-center justify-between px-4">
        <Link href="/" className="inline-flex items-center">
          <span className="text-xl font-black text-green-400">saha</span>
          <span className="text-xl font-black text-white">gram</span>
        </Link>

        <button
          type="button"
          aria-label="Menu"
          onClick={onToggle}
          className="text-xl font-bold text-white/70 transition hover:text-white"
        >
          {'\u2630'}
        </button>
      </div>
    </header>
  );
}
