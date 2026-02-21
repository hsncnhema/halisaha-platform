'use client';

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';

const bugunTarih = () => new Date().toISOString().split('T')[0];

const sonrakiGunler = () => {
  const gunler = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    gunler.push(d.toISOString().split('T')[0]);
  }
  return gunler;
};

const tarihFormat = (tarih: string) => {
  const d = new Date(tarih + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const saatiDakikayaCevir = (saat: string) => {
  const p = saat.split(':');
  return Number(p[0]) * 60 + Number(p[1]);
};

const dakikayaSaateCevir = (dakika: number) => {
  const n = dakika % (24 * 60);
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
};

const slotlarUret = (acilis: string, kapanis: string, slotSuresi: number) => {
  const slotlar: string[] = [];
  let baslangic = saatiDakikayaCevir(acilis);
  let bitis = saatiDakikayaCevir(kapanis);
  if (bitis <= baslangic) bitis += 24 * 60;
  while (baslangic + slotSuresi <= bitis) {
    slotlar.push(dakikayaSaateCevir(baslangic) + '-' + dakikayaSaateCevir(baslangic + slotSuresi));
    baslangic += slotSuresi;
  }
  return slotlar;
};

const formatOyuncuSayisi: Record<string, number> = { '5v5': 10, '6v6': 12, '7v7': 14, '8v8': 16 };

const whatsappLinki = (numara: string, sahaAdi: string, format: string, gunStr: string, slot: string) => {
  const mesaj = `Merhaba! ${sahaAdi} platformu üzerinden buldum. ${format} sahayı ${gunStr} - ${slot} saati için rezerve etmek istiyorum. Müsait misiniz?`;
  return 'https://wa.me/90' + numara + '?text=' + encodeURIComponent(mesaj);
};

const whatsappGenelLink = (numara: string, sahaAdi: string) => {
  const mesaj = `Merhaba! ${sahaAdi} platformu üzerinden buldum. Rezervasyon yapmak istiyorum, müsait misiniz?`;
  return 'https://wa.me/90' + numara + '?text=' + encodeURIComponent(mesaj);
};

export default function SahaProfilPage({ params }: { params: any }) {
  const { id } = use(params);
  const [saha, setSaha] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [seciliGun, setSeciliGun] = useState(bugunTarih());
  const gunler = sonrakiGunler();

  useEffect(() => {
    const getir = async () => {
      const docSnap = await getDoc(doc(db, 'sahalar', id));
      if (docSnap.exists()) setSaha({ id: docSnap.id, ...docSnap.data() });
      setYukleniyor(false);
    };
    getir();
  }, [id]);

  if (yukleniyor) return (
    <div className="max-w-2xl mx-auto mt-24 px-4 text-center text-gray-400 text-sm">Yükleniyor...</div>
  );

  if (!saha) return (
    <div className="max-w-2xl mx-auto mt-24 px-4 text-center">
      <p className="text-gray-400 mb-3">Saha bulunamadı.</p>
      <Link href="/" className="text-green-600 hover:underline text-sm">Ana sayfaya dön</Link>
    </div>
  );

  const slotlar = saha.acilisSaati && saha.kapanisSaati && saha.slotSuresi
    ? slotlarUret(saha.acilisSaati, saha.kapanisSaati, saha.slotSuresi)
    : [];

  const musaitlik = saha.musaitlik || {};
  const oyuncuSayisi = formatOyuncuSayisi[saha.format] || 14;
  const kisiBasiFiyat = saha.fiyat ? Math.round(saha.fiyat / oyuncuSayisi) : null;
  const whatsappNumara = saha.telefon ? saha.telefon.replace(/\D/g, '') : '';
  const bosSlotSayisi = slotlar.filter(s => (musaitlik[seciliGun + '_' + s] || 'bos') === 'bos').length;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16 pt-6">

      <Link href="/" className="text-sm text-green-600 hover:underline">← Ana Sayfaya Dön</Link>

      {/* BİLGİ KARTI */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-4 mb-3">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-extrabold mb-1">🏟️ {saha.sahaAdi}</h1>
            {(saha.il || saha.ilce) && (
              <p className="text-sm text-gray-400">📍 {[saha.il, saha.ilce].filter(Boolean).join(' / ')}</p>
            )}
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
            bosSlotSayisi > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {bosSlotSayisi > 0 ? `✅ ${bosSlotSayisi} boş slot` : '❌ Dolu'}
          </span>
        </div>

        {/* BİLGİ KUTULARI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {saha.format && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="text-xs font-bold text-green-600 mb-1">FORMAT</div>
              <div className="text-lg font-extrabold">{saha.format}</div>
            </div>
          )}
          {saha.fiyat && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="text-xs font-bold text-green-600 mb-1">SAATLİK</div>
              <div className="text-lg font-extrabold">{saha.fiyat} ₺</div>
            </div>
          )}
          {kisiBasiFiyat && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="text-xs font-bold text-blue-600 mb-1">KİŞİ BAŞI</div>
              <div className="text-lg font-extrabold">{kisiBasiFiyat} ₺</div>
            </div>
          )}
          {saha.acilisSaati && saha.kapanisSaati && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="text-xs font-bold text-gray-400 mb-1">ÇALIŞMA</div>
              <div className="text-sm font-bold">{saha.acilisSaati} - {saha.kapanisSaati}</div>
            </div>
          )}
        </div>

        {/* WHATSAPP & TELEFON */}
        {saha.telefon && (
          <div className="flex flex-col gap-2">
            <a
              href={whatsappGenelLink(whatsappNumara, saha.sahaAdi)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 text-white text-center font-bold text-sm rounded-xl transition"
              style={{ background: '#25D366' }}
            >
              💬 WhatsApp ile İletişime Geç
            </a>
            <a
              href={'tel:' + saha.telefon}
              className="block w-full py-2.5 border border-gray-200 text-gray-600 text-center font-semibold text-sm rounded-xl hover:bg-gray-50 transition"
            >
              📞 {saha.telefon}
            </a>
          </div>
        )}
      </div>

      {/* MÜSAİTLİK TAKVİMİ */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-3">
        <h2 className="text-base font-extrabold mb-4">📅 Müsaitlik Durumu</h2>

        {/* GÜN SEÇİCİ */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {gunler.map(gun => (
            <button
              key={gun}
              onClick={() => setSeciliGun(gun)}
              className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-bold transition whitespace-nowrap ${
                seciliGun === gun
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
              }`}
            >
              {tarihFormat(gun)}
            </button>
          ))}
        </div>

        {/* SLOTLAR */}
        {slotlar.length === 0 ? (
          <p className="text-sm text-gray-400">Müsaitlik bilgisi henüz girilmemiş.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {slotlar.map(slot => {
              const bos = (musaitlik[seciliGun + '_' + slot] || 'bos') === 'bos';
              return (
                <div
                  key={slot}
                  className={`flex justify-between items-center px-4 py-3 rounded-xl border ${
                    bos ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <span className="font-bold text-sm">{slot}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${bos ? 'text-green-600' : 'text-red-500'}`}>
                      {bos ? '✅ Boş' : '❌ Dolu'}
                    </span>
                    {bos && saha.telefon && (
                      <a
                        href={whatsappLinki(whatsappNumara, saha.sahaAdi, saha.format, tarihFormat(seciliGun), slot)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-white text-xs font-bold rounded-lg transition whitespace-nowrap"
                        style={{ background: '#25D366' }}
                      >
                        💬 Rezerve Et
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KURALLAR */}
      {saha.kurallar && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-base font-extrabold mb-3">📋 Saha Kuralları</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{saha.kurallar}</p>
        </div>
      )}

    </div>
  );
}
