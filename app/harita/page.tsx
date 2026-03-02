'use client';

import { getSahalar } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
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

type SahaItem = Awaited<ReturnType<typeof getSahalar>>[number];

export default function HaritaPage() {
  const [sahalar, setSahalar] = useState<SahaItem[]>([]);
  const [seciliSaha, setSeciliSaha] = useState<SahaItem | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState({ format: '' });

  useEffect(() => {
    const getir = async () => {
      try {
        const data = await getSahalar();
        const normalize = (data as SahaItem[])
          .map((saha) => {
            if (!saha.lat && saha.ilce && ILCE_KOORDINATLARI[saha.ilce]) {
              return { ...saha, lat: ILCE_KOORDINATLARI[saha.ilce].lat, lng: ILCE_KOORDINATLARI[saha.ilce].lng };
            }
            return saha;
          })
          .filter((s) => s.lat && s.lng) as SahaItem[];
        setSahalar(normalize);
      } catch (err) {
        console.error(err);
      } finally {
        setYukleniyor(false);
      }
    };
    getir();
  }, []);

  const bugunTarih = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });

  const saatiDakika = (saat: string) => {
    const p = saat.split(':');
    return Number(p[0]) * 60 + Number(p[1]);
  };

  const dakikaSaat = (dakika: number) => {
    const n = dakika % (24 * 60);
    return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  };

  const bosSlotSayisi = (saha: SahaItem) => {
    if (!saha.acilisSaati || !saha.kapanisSaati || !saha.slotSuresi) return null;
    const musaitlik = saha.musaitlik || {};
    let baslangic = saatiDakika(saha.acilisSaati);
    let bitis = saatiDakika(saha.kapanisSaati);
    if (bitis <= baslangic) bitis += 24 * 60;
    let bos = 0;
    while (baslangic + saha.slotSuresi <= bitis) {
      const slot = `${dakikaSaat(baslangic)}-${dakikaSaat(baslangic + saha.slotSuresi)}`;
      if ((musaitlik[`${bugunTarih}_${slot}`] || 'bos') === 'bos') bos++;
      baslangic += saha.slotSuresi;
    }
    return bos;
  };

  const filtrelenmis = sahalar.filter((s) => {
    if (filtre.format && s.format !== filtre.format) return false;
    return true;
  });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="flex h-screen flex-col">
      <div className="z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-green-600 hover:underline">
            ← Ana Sayfa
          </Link>
          <h1 className="text-base font-extrabold text-green-600">🗺️ Halı Sahalar</h1>
          <span className="text-xs text-gray-400">{filtrelenmis.length} saha</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtre.format}
            onChange={(e) => setFiltre({ format: e.target.value })}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-green-400 focus:outline-none"
          >
            <option value="">Tüm Formatlar</option>
            <option value="5v5">5v5</option>
            <option value="6v6">6v6</option>
            <option value="7v7">7v7</option>
            <option value="8v8">8v8</option>
          </select>
          <Link href="/sahalar" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50">
            Liste Görünümü
          </Link>
        </div>
      </div>

      <div className="relative flex-1">
        {yukleniyor ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">Yükleniyor...</div>
        ) : (
          <APIProvider apiKey={apiKey ?? ''}>
            <Map
              defaultCenter={ISTANBUL_MERKEZ}
              defaultZoom={11}
              mapId="halisaha-map"
              style={{ width: '100%', height: '100%' }}
              gestureHandling="greedy"
              disableDefaultUI={false}
            >
              {filtrelenmis.map((saha) => {
                const bos = bosSlotSayisi(saha);
                const boslukVar = bos === null ? true : bos > 0;
                return (
                  <AdvancedMarker
                    key={saha.id}
                    position={{ lat: saha.lat as number, lng: saha.lng as number }}
                    onClick={() => setSeciliSaha(saha)}
                  >
                    <div
                      className="cursor-pointer whitespace-nowrap rounded-full border-2 border-white px-2.5 py-1 text-xs font-bold text-white shadow-md"
                      style={{ background: boslukVar ? '#16a34a' : '#dc2626' }}
                    >
                      🏟️ {saha.sahaAdi}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {seciliSaha && (
                <InfoWindow
                  position={{ lat: seciliSaha.lat as number, lng: seciliSaha.lng as number }}
                  onCloseClick={() => setSeciliSaha(null)}
                >
                  <div className="min-w-48 p-2">
                    <h3 className="mb-1.5 text-sm font-extrabold">🏟️ {seciliSaha.sahaAdi}</h3>
                    {seciliSaha.ilce && <p className="mb-1 text-xs text-gray-400">📍 {[seciliSaha.il, seciliSaha.ilce].filter(Boolean).join(' / ')}</p>}
                    {seciliSaha.format && <p className="mb-1 text-xs">⚽ {seciliSaha.format}</p>}
                    {seciliSaha.fiyat && <p className="mb-3 text-xs">💰 {seciliSaha.fiyat} ₺ / saat</p>}
                    <Link
                      href={`/saha/${seciliSaha.id}`}
                      className="block rounded-lg bg-green-600 px-3 py-1.5 text-center text-xs font-bold text-white transition hover:bg-green-700"
                    >
                      Sahayı Gör →
                    </Link>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        )}
      </div>
    </div>
  );
}
