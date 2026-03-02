'use client';

import { useEffect, useState } from 'react';
import { getIlanlar, getSahalar, supabase } from '@/lib/supabase';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import Link from 'next/link';

const ISTANBUL_MERKEZ = { lat: 41.0082, lng: 28.9784 };

const ILCE_KOORDINATLARI: Record<string, { lat: number; lng: number }> = {
  Adalar: { lat: 40.8713, lng: 29.1253 },
  Arnavutköy: { lat: 41.1853, lng: 28.7397 },
  Ataşehir: { lat: 40.9833, lng: 29.1167 },
  Avcılar: { lat: 40.9798, lng: 28.7219 },
  Bağcılar: { lat: 41.0397, lng: 28.8561 },
  Bahçelievler: { lat: 40.9997, lng: 28.8519 },
  Bakırköy: { lat: 40.9819, lng: 28.8719 },
  Başakşehir: { lat: 41.0942, lng: 28.8019 },
  Bayrampaşa: { lat: 41.0453, lng: 28.9153 },
  Beşiktaş: { lat: 41.0422, lng: 29.0061 },
  Beykoz: { lat: 41.1333, lng: 29.1167 },
  Beylikdüzü: { lat: 40.9819, lng: 28.6419 },
  Beyoğlu: { lat: 41.0333, lng: 28.9833 },
  Büyükçekmece: { lat: 41.0219, lng: 28.5819 },
  Çatalca: { lat: 41.1433, lng: 28.4619 },
  Çekmeköy: { lat: 41.0319, lng: 29.1819 },
  Esenler: { lat: 41.0433, lng: 28.8753 },
  Esenyurt: { lat: 41.0319, lng: 28.6753 },
  Eyüpsultan: { lat: 41.0753, lng: 28.9319 },
  Fatih: { lat: 41.0186, lng: 28.9397 },
  Gaziosmanpaşa: { lat: 41.0653, lng: 28.9119 },
  Güngören: { lat: 41.0219, lng: 28.8719 },
  Kadıköy: { lat: 40.9819, lng: 29.0819 },
  Kağıthane: { lat: 41.0753, lng: 28.9719 },
  Kartal: { lat: 40.9053, lng: 29.1853 },
  Küçükçekmece: { lat: 41.0019, lng: 28.7719 },
  Maltepe: { lat: 40.9353, lng: 29.1319 },
  Pendik: { lat: 40.8753, lng: 29.2319 },
  Sancaktepe: { lat: 41.0019, lng: 29.2219 },
  Sarıyer: { lat: 41.1653, lng: 29.0519 },
  Silivri: { lat: 41.0733, lng: 28.2453 },
  Sultanbeyli: { lat: 40.9619, lng: 29.2653 },
  Sultangazi: { lat: 41.1053, lng: 28.8719 },
  Şile: { lat: 41.1753, lng: 29.6119 },
  Şişli: { lat: 41.0653, lng: 28.9919 },
  Tuzla: { lat: 40.8153, lng: 29.2953 },
  Ümraniye: { lat: 41.0153, lng: 29.1253 },
  Üsküdar: { lat: 41.0253, lng: 29.0153 },
  Zeytinburnu: { lat: 41.0019, lng: 28.9019 },
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

export default function AnaSayfa() {
  const [kullanici, setKullanici] = useState<{ id: string; ad: string; tip: string | null } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sahalar, setSahalar] = useState<SahaItem[]>([]);
  const [ilanlar, setIlanlar] = useState<IlanItem[]>([]);

  useEffect(() => {
    const yukle = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase.from('profiles').select('ad, tip').eq('id', user.id).maybeSingle();
          setKullanici({
            id: user.id,
            ad: profile?.ad || user.user_metadata?.full_name || user.user_metadata?.name || 'Oyuncu',
            tip: profile?.tip,
          });
        } else {
          setKullanici(null);
        }

        const [sahalarData, ilanlarData] = await Promise.all([getSahalar(), getIlanlar(5)]);
        const normalizeSahalar = (sahalarData as SahaItem[]).map((s) => {
          if (!s.lat && s.ilce && ILCE_KOORDINATLARI[s.ilce]) {
            return { ...s, lat: ILCE_KOORDINATLARI[s.ilce].lat, lng: ILCE_KOORDINATLARI[s.ilce].lng };
          }
          return s;
        }).filter((s) => s.lat && s.lng) as SahaItem[];

        setSahalar(normalizeSahalar);
        setIlanlar(ilanlarData as IlanItem[]);
      } catch (err) {
        console.error(err);
      } finally {
        setYukleniyor(false);
      }
    };

    yukle();
  }, []);

  if (yukleniyor) {
    return (
      <div className="mx-auto mt-24 max-w-2xl px-4 text-center">
        <p className="text-gray-500">Yükleniyor...</p>
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-green-600">⚽ HalıSaha</h1>
        <div>
          {kullanici ? (
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-gray-500 sm:block">Merhaba, {kullanici.ad || 'Oyuncu'}</span>
              <Link href="/profil" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700">
                Profilim
              </Link>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="rounded-lg border-2 border-green-600 px-4 py-2 text-sm font-semibold text-green-600 transition hover:bg-green-50">
                Giriş Yap
              </Link>
              <Link href="/kayit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700">
                Kayıt Ol
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mb-10 text-center">
        <h2 className="mb-3 text-3xl font-extrabold leading-tight sm:text-4xl">
          Yakınındaki halı sahaları bul, <span className="text-green-600">müsait saatleri gör.</span>
        </h2>
        <p className="mb-6 text-base text-gray-500">Sahayı bul, WhatsApp&apos;tan rezervasyon yap. Oyuncu ara, takım bul.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/harita" className="rounded-lg bg-green-600 px-6 py-3 text-base font-bold text-white transition hover:bg-green-700">
            🗺️ Haritada Ara
          </Link>
          <Link href="/ilanlar" className="rounded-lg border-2 border-green-600 px-6 py-3 text-base font-bold text-green-600 transition hover:bg-green-50">
            📋 İlan Panosu
          </Link>
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-extrabold">🏟️ İstanbul&apos;da {sahalar.length} aktif saha</h3>
          <Link href="/harita" className="text-sm font-semibold text-green-600 hover:underline">
            Tümünü haritada gör →
          </Link>
        </div>
        <div className="h-64 overflow-hidden rounded-2xl border border-green-100 sm:h-80">
          <APIProvider apiKey={apiKey ?? ''}>
            <Map
              defaultCenter={ISTANBUL_MERKEZ}
              defaultZoom={10}
              mapId="halisaha-mini-map"
              style={{ width: '100%', height: '100%' }}
              gestureHandling="cooperative"
              disableDefaultUI
            >
              {sahalar.map((saha) => (
                <AdvancedMarker
                  key={saha.id}
                  position={{ lat: saha.lat as number, lng: saha.lng as number }}
                  onClick={() => {
                    window.location.href = `/saha/${saha.id}`;
                  }}
                >
                  <div className="cursor-pointer whitespace-nowrap rounded-full border-2 border-white bg-green-600 px-2 py-1 text-xs font-bold text-white shadow-md">
                    🏟️ {saha.sahaAdi}
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </div>
      </div>

      {sahalar.length > 0 && (
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold">🏟️ Sahalar</h3>
            <Link href="/sahalar" className="text-sm font-semibold text-green-600 hover:underline">
              Tümünü gör →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sahalar.slice(0, 4).map((saha) => (
              <Link
                key={saha.id}
                href={`/saha/${saha.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-green-100 bg-white px-4 py-3 transition hover:border-green-300 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{saha.sahaAdi}</p>
                  <p className="mt-0.5 text-xs text-gray-500">📍 {saha.ilce} · {saha.format}</p>
                </div>
                <span className="shrink-0 text-sm font-extrabold text-green-600">{saha.fiyat ? `${saha.fiyat}₺` : '—'}</span>
              </Link>
            ))}
          </div>
          {sahalar.length > 4 && (
            <div className="mt-4 text-center">
              <Link href="/sahalar" className="inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-green-700">
                Tüm Sahaları Gör ({sahalar.length} saha)
              </Link>
            </div>
          )}
        </div>
      )}

      {ilanlar.length > 0 && (
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold">📋 Son İlanlar</h3>
            <Link href="/ilanlar" className="text-sm font-semibold text-green-600 hover:underline">
              Tümünü gör →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {ilanlar.map((ilan) => (
              <div key={ilan.id} className="flex items-start justify-between gap-3 rounded-xl border border-green-100 bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        ilan.kategori === 'Oyuncu Arıyorum' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ilan.kategori}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">📍 {ilan.ilce}</span>
                  </div>
                  <p className="truncate text-sm font-bold">{ilan.baslik}</p>
                  {ilan.tarih && <p className="mt-0.5 text-xs font-semibold text-green-600">🗓 {ilan.tarih} {ilan.saat}</p>}
                </div>
                <span className="shrink-0 text-xs text-gray-400">⏱ {kalanSure(ilan.silinmeZamani)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: '🗺️', baslik: 'Haritada Keşfet', aciklama: 'Çevrendeki sahaları harita üzerinde gör. Boş saatler yeşil, dolu saatler kırmızı.' },
          { icon: '📋', baslik: 'İlan Panosu', aciklama: 'Oyuncu ara veya takım bul. İlçene özel ilanları gör.' },
          { icon: '💬', baslik: 'WhatsApp ile Rezervasyon', aciklama: 'Tek tıkla sahaya yaz. Mesajın otomatik hazırlanır.' },
        ].map((item, i) => (
          <div key={i} className="rounded-2xl border border-green-100 bg-white p-5">
            <div className="mb-3 text-3xl">{item.icon}</div>
            <div className="mb-1 text-sm font-bold">{item.baslik}</div>
            <div className="text-xs leading-relaxed text-gray-500">{item.aciklama}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
