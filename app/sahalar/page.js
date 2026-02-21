'use client';

import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const ILLER: Record<string, string[]> = {
  'İstanbul': [
    'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
    'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
    'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
    'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
    'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
    'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
    'Ümraniye', 'Üsküdar', 'Zeytinburnu'
  ],
  'Ankara': [
    'Altındağ', 'Çankaya', 'Etimesgut', 'Keçiören', 'Mamak', 'Pursaklar',
    'Sincan', 'Yenimahalle'
  ],
  'İzmir': [
    'Balçova', 'Bayraklı', 'Bornova', 'Buca', 'Çiğli', 'Gaziemir',
    'Güzelbahçe', 'Karabağlar', 'Karşıyaka', 'Konak', 'Narlıdere', 'Torbalı'
  ],
};

export default function SahalarPage() {
  const [sahalar, setSahalar] = useState<any[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState({ il: '', ilce: '', format: '', arama: '' });

  useEffect(() => {
    const q = query(collection(db, 'sahalar'), where('durum', '==', 'aktif'));
    const unsub = onSnapshot(q, (snap) => {
      setSahalar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  const ilceler = filtre.il ? (ILLER[filtre.il] || []) : Object.values(ILLER).flat().sort();

  const filtrelenmis = sahalar.filter(s => {
    if (filtre.il && s.il !== filtre.il) return false;
    if (filtre.ilce && s.ilce !== filtre.ilce) return false;
    if (filtre.format && s.format !== filtre.format) return false;
    if (filtre.arama && !s.sahaAdi?.toLowerCase().includes(filtre.arama.toLowerCase())) return false;
    return true;
  });

  const bugunTarih = new Date().toISOString().split('T')[0];

  const saatiDakika = (saat: string) => {
    const p = saat.split(':');
    return Number(p[0]) * 60 + Number(p[1]);
  };

  const dakikaSaat = (dakika: number) => {
    const n = dakika % (24 * 60);
    return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  };

  const bosSlotSayisi = (saha: any) => {
    if (!saha.acilisSaati || !saha.kapanisSaati || !saha.slotSuresi) return null;
    const musaitlik = saha.musaitlik || {};
    let baslangic = saatiDakika(saha.acilisSaati);
    let bitis = saatiDakika(saha.kapanisSaati);
    if (bitis <= baslangic) bitis += 24 * 60;
    let bos = 0;
    let toplam = 0;
    while (baslangic + saha.slotSuresi <= bitis) {
      const slot = dakikaSaat(baslangic) + '-' + dakikaSaat(baslangic + saha.slotSuresi);
      toplam++;
      if ((musaitlik[bugunTarih + '_' + slot] || 'bos') === 'bos') bos++;
      baslangic += saha.slotSuresi;
    }
    return { bos, toplam };
  };

  const filtreVarMi = filtre.il || filtre.ilce || filtre.format || filtre.arama;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16 pt-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/" className="text-sm text-green-600 hover:underline">← Ana Sayfa</Link>
          <h1 className="text-2xl font-extrabold mt-1">🏟️ Halı Sahalar</h1>
        </div>
        <span className="text-sm text-gray-400 font-medium">{filtrelenmis.length} saha</span>
      </div>

      {/* ARAMA */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="🔍 Saha adı ara..."
          value={filtre.arama}
          onChange={e => setFiltre({ ...filtre, arama: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
        />
      </div>

      {/* FİLTRELER */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <select
          value={filtre.il}
          onChange={e => setFiltre({ ...filtre, il: e.target.value, ilce: '' })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white cursor-pointer focus:outline-none focus:border-green-400"
        >
          <option value="">Tüm İller</option>
          {Object.keys(ILLER).map(il => <option key={il} value={il}>{il}</option>)}
        </select>

        <select
          value={filtre.ilce}
          onChange={e => setFiltre({ ...filtre, ilce: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white cursor-pointer focus:outline-none focus:border-green-400"
        >
          <option value="">Tüm İlçeler</option>
          {ilceler.map(i => <option key={i} value={i}>{i}</option>)}
        </select>

        <select
          value={filtre.format}
          onChange={e => setFiltre({ ...filtre, format: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white cursor-pointer focus:outline-none focus:border-green-400"
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
            className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition"
          >
            Temizle ✕
          </button>
        )}
      </div>

      {/* LİSTE */}
      {yukleniyor ? (
        <div className="text-center py-16 text-gray-400 text-sm">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🏟️</p>
          <p className="font-bold text-gray-700">Bu kriterlere uygun saha bulunamadı</p>
          <p className="text-sm text-gray-400 mt-1">Filtreyi değiştirmeyi dene</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrelenmis.map(saha => {
            const slots = bosSlotSayisi(saha);
            return (
              <Link key={saha.id} href={'/saha/' + saha.id} className="block no-underline">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-green-300 hover:shadow-sm transition cursor-pointer">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <h3 className="text-base font-extrabold mb-0.5">🏟️ {saha.sahaAdi}</h3>
                      <p className="text-sm text-gray-400">
                        📍 {[saha.il, saha.ilce].filter(Boolean).join(' / ')}
                      </p>
                    </div>
                    {slots && (
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
                        slots.bos > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {slots.bos > 0 ? `✅ ${slots.bos} boş slot` : '❌ Bugün dolu'}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {saha.format && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                        {saha.format}
                      </span>
                    )}
                    {saha.fiyat && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">
                        {saha.fiyat} ₺ / saat
                      </span>
                    )}
                    {saha.acilisSaati && saha.kapanisSaati && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">
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