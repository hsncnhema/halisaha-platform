'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type KullaniciTipi = 'futbolcu' | 'saha' | 'admin' | null;

type NavItem = {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
  adminOnly?: boolean;
  authOnly?: boolean;
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Ana Sayfa', icon: '\u{1F3E0}' },
  { href: '/sahalar', label: 'Sahalar', icon: '\u{1F50D}' },
  { href: '/harita', label: 'Harita', icon: '\u{1F5FA}\uFE0F' },
  { href: '/ilanlar', label: 'Ilanlar', icon: '\u{1F4CB}' },
  { href: '/mesajlar', label: 'Mesajlar', icon: '\u{1F4AC}', disabled: true, authOnly: true },
  { href: '/profil', label: 'Profil', icon: '\u{1F464}', authOnly: true },
  { href: '/admin', label: 'Admin', icon: '\u2699\uFE0F', adminOnly: true, authOnly: true },
];

const getAktif = (pathname: string, href: string) => {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [tip, setTip] = useState<KullaniciTipi>(null);
  const [ad, setAd] = useState<string>('Misafir');
  const [girisYapti, setGirisYapti] = useState(false);

  useEffect(() => {
    let aktif = true;

    const kullaniciYukle = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!aktif) return;
      if (!user) {
        setTip(null);
        setAd('Misafir');
        setGirisYapti(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('ad, tip')
        .eq('id', user.id)
        .maybeSingle();

      if (!aktif) return;
      setTip((profile?.tip as KullaniciTipi) ?? 'futbolcu');
      setAd(profile?.ad || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanici');
      setGirisYapti(true);
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

  const gorunenNavItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (item.authOnly && !girisYapti) return false;
        if (item.adminOnly && tip !== 'admin') return false;
        return true;
      }),
    [girisYapti, tip]
  );

  const cikisYap = async () => {
    await supabase.auth.signOut();
    onClose();
    router.push('/login');
    router.refresh();
  };

  const mobilAcikClass = isOpen ? 'translate-x-0' : '-translate-x-full';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-white/10 bg-green-950 transition-transform duration-300 ease-in-out ${mobilAcikClass} md:translate-x-0`}
      >
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <Link href="/" className="inline-flex items-center" onClick={onClose}>
            <span className="text-xl font-black text-green-400">saha</span>
            <span className="text-xl font-black text-white">gram</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {gorunenNavItems.map((item) => {
            const aktif = getAktif(pathname, item.href);

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/30"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-white/20">Yakinda</span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${aktif
                  ? 'bg-green-800/50 text-green-400'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm font-semibold text-white mb-2">{ad}</p>
          {girisYapti ? (
            <button
              onClick={cikisYap}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Cikis Yap
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/kayit"
                onClick={onClose}
                className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-center text-sm font-semibold text-green-400 transition hover:bg-green-500/20"
              >
                Uye Ol
              </Link>
              <Link
                href="/login"
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Giris Yap
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
