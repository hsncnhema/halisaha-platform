'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type KullaniciBilgisi = {
  ad: string | null;
  email: string | null;
};

const bosKullanici: KullaniciBilgisi = {
  ad: null,
  email: null,
};

const getInitials = (ad: string | null, email: string | null) => {
  const kaynak = (ad || email?.split('@')[0] || 'SG').trim();
  if (!kaynak) return 'SG';
  const parcali = kaynak.split(/\s+/).filter(Boolean);
  if (parcali.length >= 2) return `${parcali[0][0]}${parcali[1][0]}`.toUpperCase();
  return kaynak.slice(0, 2).toUpperCase();
};

export default function AppNavbar() {
  const [kullanici, setKullanici] = useState<KullaniciBilgisi>(bosKullanici);

  useEffect(() => {
    let aktif = true;

    const kullaniciYukle = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!aktif) return;
      if (!user) {
        setKullanici(bosKullanici);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('ad')
        .eq('id', user.id)
        .maybeSingle();

      if (!aktif) return;
      setKullanici({
        ad: profile?.ad ?? null,
        email: user.email ?? null,
      });
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

  const initials = useMemo(() => getInitials(kullanici.ad, kullanici.email), [kullanici.ad, kullanici.email]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-green-950/90 backdrop-blur-md md:hidden">
      <div className="mx-auto flex h-14 max-h-14 items-center justify-between px-4">
        <Link href="/" className="inline-flex items-center">
          <span className="text-xl font-black text-green-400">saha</span>
          <span className="text-xl font-black text-white">gram</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xs font-bold text-white">
            {initials}
          </div>
          <button
            type="button"
            aria-label="Menu"
            className="text-xl font-bold text-white/70 transition hover:text-white"
          >
            {'\u2630'}
          </button>
        </div>
      </div>
    </header>
  );
}
