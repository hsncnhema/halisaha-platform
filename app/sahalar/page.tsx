'use client';

import { getSahalar } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const ILLER: Record<string, string[]> = {
  İstanbul: [
    'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
    'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
    'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
    'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
    'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
    'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
    'Ümraniye', 'Üsküdar', 'Zeytinburnu',
  ],
  Ankara: [
    'Altındağ', 'Çankaya', 'Etimesgut', 'Keçiören', 'Mamak', 'Pursaklar',
    'Sincan', 'Yenimahalle',
  ],
  İzmir: [
    'Balçova', 'Bayraklı', 'Bornova', 'Buca', 'Çiğli', 'Gaziemir',
    'Güzelbahçe', 'Karabağlar', 'Karşıyaka', 'Konak', 'Narlıdere', 'Torbalı',
  ],
};

type SahaItem = Awaited<ReturnType<typeof getSahalar>>[number];

export default function SahalarPage() {
  const [sahalar, setSahalar] = useState<SahaItem[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState({ il: '', ilce: '', format: '', arama: '' });

  useEffect(() => {
    const yukle = async () => {
      try {
        const data = await getSahalar();
        setSahalar(data as SahaItem[]);
      } catch (err) {
        console.error(err);
      } finally {
        setYukleniyor(false);
      }
    };
    yukle();
  }, []);

  const ilceler = filtre.il ? ILLER[filtre.il] || [] : Object.values(ILLER).flat().sort();

  const filtrelenmis = sahalar.filter((s) => {
    if (filtre.il && s.il !== filtre.il) return false;
    if (filtre.ilce && s.ilce !== filtre.ilce) return false;
    if (filtre.format && s.format !== filtre.format) return false;
    if (filtre.arama && !s.sahaAdi?.toLowerCase().includes(filtre.arama.toLowerCase())) return false;
    return true;
  });

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
    let toplam = 0;
    while (baslangic + saha.slotSuresi <= bitis) {
      const slot = `${dakikaSaat(baslangic)}-${dakikaSaat(baslangic + saha.slotSuresi)}`;
      toplam++;
      if ((musaitlik[`${bugunTarih}_${slot}`] || 'bos') === 'bos') bos++;
      baslangic += saha.slotSuresi;
    }
    return { bos, toplam };
  };

  const filtreVarMi = filtre.il || filtre.ilce || filtre.format || filtre.arama;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-green-600 hover:underline">
            ← Ana Sayfa
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold">🏟️ Halı Sahalar</h1>
        </div>
        <span className="text-sm font-medium text-gray-400">{filtrelenmis.length} saha</span>
      </div>

      <div className="mb-3">
        <input
          type="text"
          placeholder="🔍 Saha adı ara..."
          value={filtre.arama}
          onChange={(e) => setFiltre({ ...filtre, arama: e.target.value })}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <select
          value={filtre.il}
          onChange={(e) => setFiltre({ ...filtre, il: e.target.value, ilce: '' })}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
        >
          <option value="">Tüm İller</option>
          {Object.keys(ILLER).map((il) => (
            <option key={il} value={il}>
              {il}
            </option>
          ))}
        </select>

        <select
          value={filtre.ilce}
          onChange={(e) => setFiltre({ ...filtre, ilce: e.target.value })}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
        >
          <option value="">Tüm İlçeler</option>
          {ilceler.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>

        <select
          value={filtre.format}
          onChange={(e) => setFiltre({ ...filtre, format: e.target.value })}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
        >
          <option value="">Tüm Formatlar</option>
          <option value="5v5">5v5</option>
          <option value="6v6">6v6</option>
          <option value="7v7">7v7</option>
          <option value="8v8">8v8</option>
        </select>

        {filtreVarMi && (
          <button
            onClick={() => setFiltre({ il: '', ilce: '', format: '', arama: '' })}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            Temizle ✕
          </button>
        )}
      </div>

      {yukleniyor ? (
        <div className="py-16 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <p className="mb-3 text-4xl">🏟️</p>
          <p className="font-bold text-gray-700">Bu kriterlere uygun saha bulunamadı</p>
          <p className="mt-1 text-sm text-gray-400">Filtreyi değiştirmeyi dene</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrelenmis.map((saha) => {
            const slots = bosSlotSayisi(saha);
            return (
              <Link key={saha.id} href={`/saha/${saha.id}`} className="block no-underline">
                <div className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 transition hover:border-green-300 hover:shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="mb-0.5 text-base font-extrabold">🏟️ {saha.sahaAdi}</h3>
                      <p className="text-sm text-gray-400">📍 {[saha.il, saha.ilce].filter(Boolean).join(' / ')}</p>
                    </div>
                    {slots && (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          slots.bos > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {slots.bos > 0 ? `✅ ${slots.bos} boş slot` : '❌ Bugün dolu'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {saha.format && (
                      <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700">
                        {saha.format}
                      </span>
                    )}
                    {saha.fiyat && (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                        {saha.fiyat} ₺ / saat
                      </span>
                    )}
                    {saha.acilisSaati && saha.kapanisSaati && (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                        🕐 {saha.acilisSaati} - {saha.kapanisSaati}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
