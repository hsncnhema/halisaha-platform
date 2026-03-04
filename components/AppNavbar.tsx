'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { MessageCircle, User } from 'lucide-react';

type AppNavbarProps = {
  onToggle: () => void;
};

export default function AppNavbar({ onToggle }: AppNavbarProps) {
  const [kullanici, setKullanici] = useState<{ id: string; ad: string } | null>(null);

  useEffect(() => {
    const kontrol = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('ad')
          .eq('id', user.id)
          .single();
        setKullanici({ id: user.id, ad: profile?.ad || '' });
      }
    };
    kontrol();
  }, []);

  const basHarf = kullanici?.ad?.trim()
    ? kullanici.ad.trim().charAt(0).toLocaleUpperCase('tr-TR')
    : '';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-green-950/90 backdrop-blur-md md:hidden">
      <div className="relative mx-auto flex h-14 max-h-14 items-center justify-between px-4">
        {/* Sol: Hamburger */}
        <button
          type="button"
          aria-label="Menu"
          onClick={onToggle}
          className="text-xl font-bold text-white/70 transition hover:text-white"
        >
          {'\u2630'}
        </button>

        {/* Orta: sahagram logosu (absolute merkez) */}
        <Link
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center"
        >
          <span className="text-xl font-black text-green-400">saha</span>
          <span className="text-xl font-black text-white">gram</span>
        </Link>

        {/* Sağ: Kullanıcı durumuna göre */}
        <div className="flex items-center gap-3">
          {kullanici ? (
            <>
              <Link
                href="/mesajlar"
                className="inline-flex items-center justify-center"
                aria-label="Mesajlar"
              >
                <MessageCircle className="w-5 h-5 text-white/70 hover:text-white transition" />
              </Link>
              <Link href="/profil">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white transition hover:bg-green-500">
                  {basHarf || <User className="w-4 h-4 text-white" />}
                </div>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-green-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-green-500"
            >
              Giriş
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

