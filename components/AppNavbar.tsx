'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { MessageCircle, Search, User } from 'lucide-react';

type AppNavbarProps = {
  onToggle: () => void;
};

type AramaSonucu = {
  id: string;
  ad: string | null;
  email: string | null;
};

export default function AppNavbar({ onToggle }: AppNavbarProps) {
  const [kullanici, setKullanici] = useState<{ id: string; ad: string } | null>(null);
  const [aramaAcik, setAramaAcik] = useState(false);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaSonuclari, setAramaSonuclari] = useState<AramaSonucu[]>([]);
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
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

        // Bildirim sayısını çek
        const { count } = await supabase
          .from('arkadasliklar')
          .select('id', { count: 'exact' })
          .eq('alici_id', user.id)
          .eq('durum', 'beklemede');

        setBildirimSayisi(count || 0);

        // Realtime bildirimleri dinle
        const channel = supabase.channel('bildirimler')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'arkadasliklar',
            filter: `alici_id=eq.${user.id}`
          }, () => {
            setBildirimSayisi(prev => prev + 1);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };
    kontrol();
  }, []);

  useEffect(() => {
    if (pathname === '/mesajlar') {
      setBildirimSayisi(0);
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
        <div ref={aramaAlaniRef} className="flex items-center gap-3">
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
                className="relative inline-flex items-center justify-center"
                aria-label="Mesajlar"
              >
                <MessageCircle className="w-5 h-5 text-white/70 hover:text-white transition" />
                {bildirimSayisi > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white pointer-events-none">
                    {bildirimSayisi}
                  </span>
                )}
              </Link>
              <Link href="/profil">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white transition hover:bg-green-500">
                  {basHarf || <User className="w-4 h-4 text-white" />}
                </div>
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
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-green-500"
            >
              Giriş Yap
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
