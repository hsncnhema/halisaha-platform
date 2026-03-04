'use client';

import { useState, useEffect, type ReactNode } from 'react';
import AppNavbar from '@/components/AppNavbar';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { User, MessageCircle } from 'lucide-react';

export default function LayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      kontrol();
    });

    kontrol();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const basHarf = kullanici?.ad?.trim()
    ? kullanici.ad.trim().charAt(0).toLocaleUpperCase('tr-TR')
    : '';

  return (
    <div className="flex min-h-screen relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* MASAÜSTÜ İÇİN SABİT PROFİL VE İNBOX İKONLARI */}
      <div className="hidden md:flex fixed top-4 right-4 z-50 items-center gap-3">
        {kullanici ? (
          <>
            <Link
              href="/mesajlar"
              className="inline-flex items-center justify-center"
              aria-label="Mesajlar"
            >
              <MessageCircle className="w-5 h-5 text-white/70 hover:text-white transition" />
            </Link>
            <Link
              href="/profil"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:bg-green-500 hover:scale-105"
            >
              {basHarf || <User className="w-4 h-4 text-white" />}
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-green-500 hover:scale-105"
          >
            Giriş Yap
          </Link>
        )}
      </div>

      <div className="flex flex-1 flex-col md:pl-56">
        <AppNavbar onToggle={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 md:pb-0">{children}</main>
      </div>
    </div>
  );
}

