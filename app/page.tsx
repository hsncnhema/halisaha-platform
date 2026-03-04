'use client';

import { useEffect, useState } from 'react';
import { getIlanlar, getSahalar, supabase } from '@/lib/supabase';
import { getKoordinat } from '@/lib/turkiye';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import Link from 'next/link';

const ISTANBUL_MERKEZ = { lat: 41.0082, lng: 28.9784 };

type GeocodeAddressComponent = {
  long_name: string;
  types: string[];
};

type GeocodeResult = {
  address_components?: GeocodeAddressComponent[];
};

type GeocodeResponse = {
  results?: GeocodeResult[];
};

const kalanSure = (silinmeZamani: string) => {
  const fark = new Date(silinmeZamani).getTime() - Date.now();
  const saat = Math.floor(fark / (1000 * 60 * 60));
  const dakika = Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60));
  if (saat <= 0 && dakika <= 0) return 'Süresi doldu';
  if (saat <= 0) return `${dakika}dk kaldı`;
  return `${saat}sa kaldı`;
};

type SahaItem = Awaited<ReturnType<typeof getSahalar>>[number];
type IlanItem = Awaited<ReturnType<typeof getIlanlar>>[number];
type IlanKartItem = IlanItem & { paylasanAd?: string | null };

const ilceBaslikMetni = (ilce: string | null) => {
  if (!ilce) return '\u00d6ne \u00c7\u0131kan \u0130lanlar';
  return `${ilce} \u00d6ne \u00c7\u0131kan \u0130lanlar`;
};

const YILDIZLAR = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  top: `${Math.floor((i * 7 + 13) % 100)}%`,
  left: `${Math.floor((i * 11 + 7) % 100)}%`,
  width: (i % 2) + 1,
  height: 4 + (i % 7),
  opacity: 0.15 + (i % 4) * 0.07,
  delay: `${(i * 0.2) % 3}s`,
  duration: `${2 + (i % 3)}s`,
  rotate: -15 + (i % 30),
}));

export default function AnaSayfa() {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sahalar, setSahalar] = useState<SahaItem[]>([]);
  const [ilanlar, setIlanlar] = useState<IlanKartItem[]>([]);
  const [kullaniciIlce, setKullaniciIlce] = useState<string | null>(null);
  const [haritaMerkez, setHaritaMerkez] = useState(ISTANBUL_MERKEZ);

  useEffect(() => {
    const yukle = async () => {
      try {
        const [sahalarData, ilanlarData] = await Promise.all([getSahalar(), getIlanlar(5)]);
        const normalizeSahalar = (sahalarData as SahaItem[])
          .map((s) => {
            if (typeof s.lat === 'number' && typeof s.lng === 'number') return s;
            const coord = getKoordinat(s.ilce, s.il);
            return { ...s, lat: coord.lat, lng: coord.lng };
          })
          .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number') as SahaItem[];
        setSahalar(normalizeSahalar);

        const gelenIlanlar = ilanlarData as IlanItem[];
        const userIdler = Array.from(
          new Set(gelenIlanlar.map((ilan) => ilan.userId).filter(Boolean))
        ) as string[];

        const paylasanAdMap = new globalThis.Map<string, string>();
        if (userIdler.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, ad')
            .in('id', userIdler);

          for (const profile of profileData ?? []) {
            if (profile.id && profile.ad) {
              paylasanAdMap.set(profile.id, profile.ad);
            }
          }
        }

        const zenginIlanlar: IlanKartItem[] = gelenIlanlar.map((ilan) => ({
          ...ilan,
          paylasanAd: paylasanAdMap.get(ilan.userId) ?? null,
        }));
        setIlanlar(zenginIlanlar);
      } catch (err) {
        console.error(err);
      } finally {
        setYukleniyor(false);
      }
    };
    yukle();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setHaritaMerkez(ISTANBUL_MERKEZ);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setHaritaMerkez({ lat: latitude, lng: longitude });

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;

        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=tr`
          );

          if (!res.ok) return;

          const data = (await res.json()) as GeocodeResponse;
          const components = data.results?.[0]?.address_components || [];

          const ilce = components.find(
            (c) =>
              c.types.includes('administrative_area_level_4') ||
              c.types.includes('administrative_area_level_3')
          )?.long_name;

          if (ilce) setKullaniciIlce(ilce);
        } catch (error) {
          console.error('Konum geocode hatasi:', error);
        }
      },
      () => {
        setHaritaMerkez(ISTANBUL_MERKEZ);
      }
    );
  }, []);

  useEffect(() => {
    if (ilanlar.length <= 1) return;

    const interval = setInterval(() => {
      setIlanlar((prev) => {
        const arr = [...prev];
        arr.push(arr.shift()!);
        return arr;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [ilanlar.length]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const gosterilenIlanlar = ilanlar.slice(0, 4);

  if (yukleniyor) return null;

  return (
    <div className="min-h-screen bg-green-950">

      {/* HERO */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-green-950 via-green-900 to-green-950 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:content-[''] before:bg-[radial-gradient(ellipse_at_top,_#16a34a20_0%,_transparent_60%)]">
        {YILDIZLAR.map((y) => (
          <span
            key={y.id}
            className="pointer-events-none absolute rounded-full bg-green-400 animate-sway"
            style={{
              top: y.top,
              left: y.left,
              width: `${y.width}px`,
              height: `${y.height}px`,
              opacity: y.opacity,
              animationDelay: y.delay,
              animationDuration: y.duration,
              transform: `rotate(${y.rotate}deg)`,
            }}
          />
        ))}
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-24 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-sm font-medium text-white/80">Türkiye&apos;nin Halı Saha Platformu</span>
          </div>
          <h1 className="mb-6 text-5xl font-black leading-tight text-white md:text-7xl">
            Sahaya çık,<br />
            <span className="text-green-400">takımını bul.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-lg text-lg text-white/60">
            Saha bul, oyuncu ara, takım kur. Halı sahada oynamak hiç bu kadar kolay olmamıştı.
          </p>
          <div className="mb-6 flex flex-wrap justify-center gap-4">
            <Link href="/harita" className="rounded-xl bg-green-500 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-green-500/25 transition hover:bg-green-400">
              Saha Bul
            </Link>
            <Link href="/ilanlar" className="rounded-xl border-2 border-white/20 px-8 py-3.5 text-base font-bold text-white transition hover:border-white/40 hover:bg-white/5">
              Oyuncu / Takım Ara
            </Link>
          </div>
          <div className="mb-16 flex justify-center gap-4">
            <a href="#" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-4 text-sm text-white backdrop-blur-sm transition hover:bg-white/15 hover:border-white/30">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <div className="text-left">
                <div className="text-xs leading-none text-white/50">Download on the</div>
                <div className="text-base font-bold leading-tight">App Store</div>
              </div>
            </a>
            <a href="#" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-4 text-sm text-white backdrop-blur-sm transition hover:bg-white/15 hover:border-white/30">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.49c.41.41 1.02.41 1.63.2l11.02-6.37-2.73-2.73-9.92 7.27c-.41.41-.41 1.22 0 1.63zm-.61-2.24V2.75c0-.61.2-1.02.61-1.22L13.1 11.45 3.18 21.37c-.41-.2-.61-.61-.61-1.12zM20.4 10.43l-3.06-1.73-3.06 3.06 2.86 2.86 3.27-1.94c.82-.41.82-1.63-.01-2.25zM5.62 1.25 16.33 7.4l-2.73 2.73L5.01.98c.2-.2.41-.2.61.27z"/></svg>
              <div className="text-left">
                <div className="text-xs leading-none text-white/50">GET IT ON</div>
                <div className="text-base font-bold leading-tight">Google Play</div>
              </div>
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { deger: '500+', etiket: 'Saha' },
              { deger: '10K+', etiket: 'Oyuncu' },
              { deger: '50K+', etiket: 'Maç' },
              { deger: '81', etiket: 'İl' },
            ].map((item) => (
              <div key={item.etiket} className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                <div className="flex items-center justify-center">
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <div className="text-2xl font-black text-white">{item.deger}</div>
                </div>
                <div className="text-sm text-white/50">{item.etiket}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ÖZELLİKLER */}
      <section className="bg-green-950 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-10 text-center text-2xl font-black text-white">Her şey bir arada</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: '⚽', baslik: 'Saha Bul', aciklama: 'Çevrendeki sahaları keşfet, boş saatleri gör.' },
              { icon: '👤', baslik: 'Oyuncu Profili', aciklama: 'Mevkini ve seviyeni belirle, seni görsünler.' },
              { icon: '👥', baslik: 'Takım Kur', aciklama: 'Takımını oluştur, kadroyu tamamla.' },
              { icon: '📋', baslik: 'İlan Panosu', aciklama: 'Oyuncu ara, takım bul, maç ayarla.' },
            ].map((item, index) => (
              <div
                key={item.baslik}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 opacity-0 animate-fadeInUp transition-transform duration-200 hover:bg-white/10 hover:scale-[1.02]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-600/20 text-lg">
                  {item.icon}
                </div>
                <div className="mb-1 text-sm font-bold text-white">{item.baslik}</div>
                <div className="text-xs leading-relaxed text-white/40">{item.aciklama}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HARİTA & SAHALAR */}
      <section className="bg-green-900/30 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white">🏟️ Turkiye&apos;de {sahalar.length} aktif saha</h2>
            <Link href="/harita" className="text-sm font-semibold text-green-400 hover:underline">Tümünü haritada gör →</Link>
          </div>
          <div className="mb-8 h-64 overflow-hidden rounded-2xl border border-white/10 sm:h-80">
            <APIProvider apiKey={apiKey ?? ''}>
              <Map key={`${haritaMerkez.lat}-${haritaMerkez.lng}`} defaultCenter={haritaMerkez} defaultZoom={13} mapId="halisaha-mini-map" style={{ width: '100%', height: '100%' }} gestureHandling="cooperative" disableDefaultUI>
                {sahalar.map((saha) => (
                  <AdvancedMarker key={saha.id} position={{ lat: saha.lat as number, lng: saha.lng as number }} onClick={() => { window.location.href = `/saha/${saha.id}`; }}>
                    <div className="cursor-pointer whitespace-nowrap rounded-full border-2 border-white bg-green-600 px-2 py-1 text-xs font-bold text-white shadow-md">
                      🏟️ {saha.sahaAdi}
                    </div>
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          </div>
          {sahalar.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sahalar.slice(0, 4).map((saha, index) => (
                  <Link key={saha.id} href={`/saha/${saha.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 opacity-0 animate-fadeInUp transition-all duration-200 hover:scale-[1.02] hover:border-green-500/40 hover:bg-white/10 hover:shadow-lg hover:shadow-green-900/50" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{saha.sahaAdi}</p>
                      <p className="mt-0.5 text-xs text-white/40">📍 {saha.ilce} · {saha.format}</p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-green-400">{saha.fiyat ? `${saha.fiyat}₺` : '—'}</span>
                  </Link>
                ))}
              </div>
              {sahalar.length > 4 && (
                <div className="mt-6 text-center">
                  <Link href="/sahalar" className="inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-green-500">
                    Tüm Sahaları Gör ({sahalar.length} saha)
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ÖNE ÇIKAN İLANLAR */}
      {ilanlar.length > 0 && (
        <section className="border-y border-white/5 bg-green-900/20 py-16">
          <div className="mx-auto max-w-4xl px-4">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3 h-8 w-1 bg-green-400" />
                <h2 className="animate-glow text-2xl font-black text-white">{ilceBaslikMetni(kullaniciIlce)}</h2>
              </div>
              <Link href="/ilanlar" className="text-sm font-semibold text-green-400 hover:underline">
                Tümünü gör &rarr;
              </Link>
            </div>

            {gosterilenIlanlar.length > 0 ? (
              <div className="flex flex-col gap-4 transition-all duration-700 ease-in-out">
                {gosterilenIlanlar.map((ilan) => {
                  const kategoriLower = (ilan.kategori || '').toLocaleLowerCase('tr-TR');
                  const oyuncuKategori = kategoriLower.includes('oyuncu');
                  const takimKategori =
                    kategoriLower.includes('takim');

                  return (
                    <div
                      key={ilan.id}
                      className="rounded-xl border border-white/10 border-l-4 border-l-green-400 bg-white/5 p-5 transition-all duration-700 ease-in-out hover:scale-[1.01] hover:bg-white/10 hover:shadow-lg hover:shadow-green-900/40"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              oyuncuKategori
                                ? 'border border-green-500/30 bg-green-500/20 text-green-300'
                                : takimKategori
                                  ? 'border border-blue-500/30 bg-blue-500/20 text-blue-300'
                                  : 'border border-white/15 bg-white/10 text-white/70'
                            }`}
                          >
                            {ilan.kategori}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/60">
                            Ilce: {ilan.ilce?.toLocaleUpperCase('tr-TR')}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs text-white/30">Sure: {kalanSure(ilan.silinmeZamani)}</span>
                      </div>

                      <p className="mb-2 text-lg font-bold text-white">{ilan.baslik}</p>
                      <p className="line-clamp-2 text-sm text-white/60">{ilan.aciklama}</p>

                      {(ilan.tarih || ilan.saat) && (
                        <p className="mt-3 text-sm font-semibold text-green-400">
                          Tarih: {ilan.tarih} {ilan.saat}
                        </p>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                        <span className="text-xs text-white/50">
                          Paylasan: {ilan.paylasanAd || 'Bilinmeyen Kullanici'}
                        </span>
                        <Link
                          href={`/ilanlar/${ilan.id}`}
                          className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-bold text-green-300 transition hover:bg-green-500/20"
                        >
                          Detayi Gor &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                <p className="text-sm text-white/60">Henuz ilan yok.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3 ADIMDA BAŞLA */}
      <section className="bg-green-900/30 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-8 text-center text-2xl font-black text-white">3 Adımda Başla</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { adim: '1', baslik: 'Kayıt Ol', aciklama: 'Ücretsiz profil oluştur.' },
              { adim: '2', baslik: 'Keşfet', aciklama: 'Saha ve oyuncu bul.' },
              { adim: '3', baslik: 'Sahaya Çık', aciklama: 'Maçını ayarla, oyna.' },
            ].map((item) => (
              <div key={item.adim} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-lg font-extrabold text-white">
                  {item.adim}
                </div>
                <div className="text-sm font-bold text-white">{item.baslik}</div>
                <div className="mt-1 text-xs text-white/40">{item.aciklama}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-green-950 pb-6 pt-10">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-black tracking-wide text-green-400">sahagram</p>
              <p className="text-xs leading-relaxed text-white/30">Saha bul, oyuncu ara, takım kur. Türkiye&apos;nin halı saha platformu.</p>
            </div>
            <div>
              <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/30">Linkler</h5>
              <div className="flex flex-col gap-2">
                <Link href="/" className="text-sm text-white/50 transition hover:text-green-400">Ana Sayfa</Link>
                <Link href="/sahalar" className="text-sm text-white/50 transition hover:text-green-400">Sahalar</Link>
                <Link href="/harita" className="text-sm text-white/50 transition hover:text-green-400">Harita</Link>
                <Link href="/ilanlar" className="text-sm text-white/50 transition hover:text-green-400">İlanlar</Link>
              </div>
            </div>
            <div>
              <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/30">Uygulamayı İndir</h5>
              <div className="flex flex-col gap-2">
                <a href="#" className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <span className="text-xs font-semibold">App Store</span>
                </a>
                <a href="#" className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.49c.41.41 1.02.41 1.63.2l11.02-6.37-2.73-2.73-9.92 7.27c-.41.41-.41 1.22 0 1.63zm-.61-2.24V2.75c0-.61.2-1.02.61-1.22L13.1 11.45 3.18 21.37c-.41-.2-.61-.61-.61-1.12zM20.4 10.43l-3.06-1.73-3.06 3.06 2.86 2.86 3.27-1.94c.82-.41.82-1.63-.01-2.25zM5.62 1.25 16.33 7.4l-2.73 2.73L5.01.98c.2-.2.41-.2.61.27z"/></svg>
                  <span className="text-xs font-semibold">Google Play</span>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-white/5 pt-4 text-center">
            <p className="text-xs text-white/20">&copy; 2025 Sahagram. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
