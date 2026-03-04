'use client';

import { getSahalar } from '@/lib/supabase';
import { getKoordinat } from '@/lib/turkiye';
import { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import Link from 'next/link';

const TURKIYE_MERKEZ = { lat: 39.0, lng: 35.0 };

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
            if (typeof saha.lat === 'number' && typeof saha.lng === 'number') return saha;
            const coord = getKoordinat(saha.ilce, saha.il);
            return { ...saha, lat: coord.lat, lng: coord.lng };
          })
          .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number') as SahaItem[];
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
      <div className="z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-green-950 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-extrabold text-green-400">🗺️ Halı Sahalar</h1>
          <span className="text-xs text-white/40">{filtrelenmis.length} saha</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtre.format}
            onChange={(e) => setFiltre({ format: e.target.value })}
            className="bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2"
          >
            <option value="">Tüm Formatlar</option>
            <option value="5v5">5v5</option>
            <option value="6v6">6v6</option>
            <option value="7v7">7v7</option>
            <option value="8v8">8v8</option>
          </select>
          <Link href="/sahalar" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 transition hover:bg-white/10">
            Liste Görünümü
          </Link>
        </div>
      </div>

      <div className="relative flex-1">
        {yukleniyor ? (
          <div className="flex h-full items-center justify-center text-sm text-white/40">Yükleniyor...</div>
        ) : (
          <APIProvider apiKey={apiKey ?? ''}>
            <Map
              defaultCenter={TURKIYE_MERKEZ} defaultZoom={6}
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
                    {seciliSaha.ilce && <p className="mb-1 text-xs text-white/40">📍 {[seciliSaha.il, seciliSaha.ilce].filter(Boolean).join(' / ')}</p>}
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
