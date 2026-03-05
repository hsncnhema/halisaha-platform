'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import AppNavbar from '@/components/AppNavbar';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, MessageCircle, Search } from 'lucide-react';

type AramaSonucu = {
  id: string;
  ad: string | null;
  email: string | null;
};

export default function LayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [kullanici, setKullanici] = useState<{ id: string; ad: string } | null>(null);
  const [aramaAcik, setAramaAcik] = useState(false);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaSonuclari, setAramaSonuclari] = useState<AramaSonucu[]>([]);
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
  const [mesajBildirim, setMesajBildirim] = useState(0);
  const pathname = usePathname();
  const aramaAlaniRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!kullanici) return;

    const sayiGetir = async () => {
      const { count } = await supabase
        .from('mesajlar')
        .select('id', { count: 'exact', head: true })
        .eq('alici_id', kullanici.id)
        .eq('okundu', false);
      setMesajBildirim(count || 0);
    };
    sayiGetir();

    const channel = supabase
      .channel(`layout-mesaj-${kullanici.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mesajlar',
        filter: `alici_id=eq.${kullanici.id}`
      }, () => {
        setMesajBildirim(prev => prev + 1);
      })
      .subscribe((status: string) => {
        console.log('LayoutShell realtime:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kullanici?.id]);

  useEffect(() => {
    if (pathname === '/mesajlar') {
      setMesajBildirim(0);
    }
  }, [pathname]);
  useEffect(() => {
    if (!aramaAcik) return;

    const disariTiklama = (event: MouseEvent) => {
      if (aramaAlaniRef.current && !aramaAlaniRef.current.contains(event.target as Node)) {
        setAramaAcik(false);
      }
    };

    document.addEventListener('mousedown', disariTiklama);
    return () => {
      document.removeEventListener('mousedown', disariTiklama);
    };
  }, [aramaAcik]);

  useEffect(() => {
    if (!kullanici || !aramaAcik) {
      setAramaSonuclari([]);
      setAramaYukleniyor(false);
      return;
    }

    const metin = aramaMetni.trim();
    if (metin.length < 2) {
      setAramaSonuclari([]);
      setAramaYukleniyor(false);
      return;
    }

    let aktif = true;
    setAramaYukleniyor(true);

    const zamanlayici = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, ad, email')
        .or(`ad.ilike.%${metin}%,email.ilike.%${metin}%`)
        .limit(5);

      if (!aktif) return;
      setAramaSonuclari(error || !data ? [] : (data as AramaSonucu[]));
      setAramaYukleniyor(false);
    }, 250);

    return () => {
      aktif = false;
      clearTimeout(zamanlayici);
    };
  }, [aramaAcik, aramaMetni, kullanici]);

  const basHarf = kullanici?.ad?.trim()
    ? kullanici.ad.trim().charAt(0).toLocaleUpperCase('tr-TR')
    : '';

  return (
    <div className="flex min-h-screen relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* MASAÜSTÜ İÇİN SABİT PROFİL VE İNBOX İKONLARI */}
      <div ref={aramaAlaniRef} className="hidden md:flex fixed top-4 right-4 z-50 items-center gap-3">
        {kullanici ? (
          <>
            <button
              type="button"
              onClick={() => setAramaAcik((prev) => !prev)}
              aria-label="Ara"
              className="inline-flex items-center justify-center"
            >
              <Search className="w-5 h-5 text-white/70 hover:text-white transition" />
            </button>
            <Link
              href="/mesajlar"
              className="inline-flex items-center justify-center"
              aria-label="Mesajlar"
            >
              <div className="relative">
                <MessageCircle className="w-5 h-5 text-white/70 hover:text-white transition" />
                {mesajBildirim > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {mesajBildirim}
                  </span>
                )}
              </div>
            </Link>
            <Link
              href="/profil"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:bg-green-500 hover:scale-105"
            >
              {basHarf || <User className="w-4 h-4 text-white" />}
            </Link>

            <div
              className={`fixed top-14 right-4 z-50 w-72 transition-all duration-300 ${aramaAcik ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
            >
              <div className="rounded-2xl border border-white/20 bg-green-950/95 backdrop-blur-md p-3 shadow-xl">
                <input
                  value={aramaMetni}
                  onChange={(event) => setAramaMetni(event.target.value)}
                  placeholder="Oyuncu ara..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30"
                />

                {aramaMetni.trim().length >= 2 && (
                  <div className="mt-2 space-y-1">
                    {aramaYukleniyor && (
                      <p className="px-2 py-1 text-xs text-white/60">Araniyor...</p>
                    )}

                    {!aramaYukleniyor && aramaSonuclari.length === 0 && (
                      <p className="px-2 py-1 text-xs text-white/60">Sonuc bulunamadi.</p>
                    )}

                    {!aramaYukleniyor && aramaSonuclari.map((sonuc) => (
                      <Link
                        key={sonuc.id}
                        href={`/profil/${sonuc.id}`}
                        onClick={() => {
                          setAramaAcik(false);
                          setAramaMetni('');
                        }}
                        className="block rounded-lg px-2 py-2 transition hover:bg-white/10"
                      >
                        <p className="text-sm font-semibold text-white">{sonuc.ad || 'Isimsiz Kullanici'}</p>
                        <p className="text-xs text-white/60">{sonuc.email || '-'}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
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

