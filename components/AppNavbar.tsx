'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type KullaniciTipi = 'futbolcu' | 'saha' | 'admin' | null;

type NavLink = {
  href: string;
  label: string;
};

const defaultLinks: NavLink[] = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/sahalar', label: 'Sahalar' },
  { href: '/harita', label: 'Harita' },
  { href: '/ilanlar', label: 'Ilanlar' },
];

const futbolcuLinks: NavLink[] = [...defaultLinks, { href: '/profil', label: 'Profil' }];
const sahaLinks: NavLink[] = [{ href: '/halisaha/panel', label: 'Panel' }];
const adminLinks: NavLink[] = [...futbolcuLinks, { href: '/admin', label: 'Admin' }];

export default function AppNavbar() {
  const pathname = usePathname();
  const [tip, setTip] = useState<KullaniciTipi>(null);
  const [girisYapti, setGirisYapti] = useState(false);

  useEffect(() => {
    let aktif = true;

    const kullaniciYukle = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!aktif) return;

      if (!user) {
        setGirisYapti(false);
        setTip(null);
        return;
      }

      setGirisYapti(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('tip')
        .eq('id', user.id)
        .maybeSingle();

      if (!aktif) return;
      setTip((profile?.tip as KullaniciTipi) ?? 'futbolcu');
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void kullaniciYukle();
    });

    void kullaniciYukle();

    return () => {
      aktif = false;
      subscription.unsubscribe();
    };
  }, []);

  const links = useMemo(() => {
    if (tip === 'saha') return sahaLinks;
    if (tip === 'admin') return adminLinks;
    if (tip === 'futbolcu') return futbolcuLinks;
    return defaultLinks;
  }, [tip]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-green-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-green-400 font-black text-xl">saha</span>
          <span className="text-white font-black text-xl">gram</span>
        </Link>
        <nav className="flex items-center gap-3">
          {links.map((link) => {
            const aktif = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition ${
                  aktif ? 'text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {!girisYapti && (
            <Link
              href="/login"
              className="rounded-md border border-green-400 px-2.5 py-1 text-xs font-bold text-green-400 transition hover:bg-green-400/10"
            >
              Giris
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
