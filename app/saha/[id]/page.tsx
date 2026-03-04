'use client';

import { getSahaById } from '@/lib/supabase';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';

const bugunTarih = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });

const sonrakiGunler = () => {
  const gunler: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    gunler.push(d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
  }
  return gunler;
};

const tarihFormat = (tarih: string) => {
  const d = new Date(`${tarih}T00:00:00`);
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const saatiDakikayaCevir = (saat: string) => {
  const p = saat.split(':');
  return Number(p[0]) * 60 + Number(p[1]);
};

const dakikayaSaateCevir = (dakika: number) => {
  const n = dakika % (24 * 60);
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};

const slotlarUret = (acilis: string, kapanis: string, slotSuresi: number) => {
  const slotlar: string[] = [];
  let baslangic = saatiDakikayaCevir(acilis);
  let bitis = saatiDakikayaCevir(kapanis);
  if (bitis <= baslangic) bitis += 24 * 60;
  while (baslangic + slotSuresi <= bitis) {
    slotlar.push(`${dakikayaSaateCevir(baslangic)}-${dakikayaSaateCevir(baslangic + slotSuresi)}`);
    baslangic += slotSuresi;
  }
  return slotlar;
};

const formatOyuncuSayisi: Record<string, number> = { '5v5': 10, '6v6': 12, '7v7': 14, '8v8': 16 };

const whatsappLinki = (numara: string, sahaAdi: string, format: string, gunStr: string, slot: string) => {
  const mesaj = `Merhaba! ${sahaAdi} platformu üzerinden buldum. ${format} sahayı ${gunStr} - ${slot} saati için rezerve etmek istiyorum. Müsait misiniz?`;
  return `https://wa.me/90${numara}?text=${encodeURIComponent(mesaj)}`;
};

const whatsappGenelLink = (numara: string, sahaAdi: string) => {
  const mesaj = `Merhaba! ${sahaAdi} platformu üzerinden buldum. Rezervasyon yapmak istiyorum, müsait misiniz?`;
  return `https://wa.me/90${numara}?text=${encodeURIComponent(mesaj)}`;
};

type SahaDetay = Awaited<ReturnType<typeof getSahaById>>;

export default function SahaProfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [saha, setSaha] = useState<SahaDetay>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [seciliGun, setSeciliGun] = useState(bugunTarih());
  const gunler = sonrakiGunler();

  useEffect(() => {
    const getir = async () => {
      try {
        const data = await getSahaById(id);
        setSaha(data);
      } catch (err) {
        console.error(err);
      } finally {
        setYukleniyor(false);
      }
    };
    getir();
  }, [id]);

  if (yukleniyor) {
    return <div className="min-h-screen bg-green-950 mx-auto mt-24 max-w-2xl px-4 text-center text-sm text-white/40">Yükleniyor...</div>;
  }

  if (!saha) {
    return (
      <div className="min-h-screen bg-green-950 mx-auto mt-24 max-w-2xl px-4 text-center">
        <p className="mb-3 text-white/40">Saha bulunamadı.</p>
        <Link href="/" className="text-sm text-green-400 hover:underline">
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  const slotlar =
    saha.acilisSaati && saha.kapanisSaati && saha.slotSuresi
      ? slotlarUret(saha.acilisSaati, saha.kapanisSaati, saha.slotSuresi)
      : [];

  const musaitlik = saha.musaitlik || {};
  const oyuncuSayisi = formatOyuncuSayisi[saha.format || '7v7'] || 14;
  const kisiBasiFiyat = saha.fiyat ? Math.round(saha.fiyat / oyuncuSayisi) : null;
  const whatsappNumara = saha.telefon ? saha.telefon.replace(/\D/g, '') : '';
  const bosSlotSayisi = slotlar.filter((s) => (musaitlik[`${seciliGun}_${s}`] || 'bos') === 'bos').length;

  return (
    <div className="min-h-screen bg-green-950 mx-auto max-w-2xl px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-green-400 hover:underline">
        ← Ana Sayfaya Dön
      </Link>

      <div className="mb-3 mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-xl font-extrabold text-white">🏟️ {saha.sahaAdi}</h1>
            {(saha.il || saha.ilce) && (
              <p className="text-sm text-white/40">📍 {[saha.il, saha.ilce].filter(Boolean).join(' / ')}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              bosSlotSayisi > 0 ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'
            }`}
          >
            {bosSlotSayisi > 0 ? `✅ ${bosSlotSayisi} boş slot` : '❌ Dolu'}
          </span>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {saha.format && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
              <div className="mb-1 text-xs font-bold text-green-400">FORMAT</div>
              <div className="text-lg font-extrabold text-white">{saha.format}</div>
            </div>
          )}
          {saha.fiyat && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
              <div className="mb-1 text-xs font-bold text-green-400">SAATLİK</div>
              <div className="text-lg font-extrabold text-white">{saha.fiyat} ₺</div>
            </div>
          )}
          {kisiBasiFiyat && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
              <div className="mb-1 text-xs font-bold text-blue-400">KİŞİ BAŞI</div>
              <div className="text-lg font-extrabold text-white">{kisiBasiFiyat} ₺</div>
            </div>
          )}
          {saha.acilisSaati && saha.kapanisSaati && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 text-xs font-bold text-white/30">ÇALIŞMA</div>
              <div className="text-sm font-bold text-white">
                {saha.acilisSaati} - {saha.kapanisSaati}
              </div>
            </div>
          )}
        </div>

        {saha.telefon && (
          <div className="flex flex-col gap-2">
            <a
              href={whatsappGenelLink(whatsappNumara, saha.sahaAdi)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl py-3 text-center text-sm font-bold text-white transition"
              style={{ background: '#25D366' }}
            >
              💬 WhatsApp ile İletişime Geç
            </a>
            <a
              href={`tel:${saha.telefon}`}
              className="block w-full rounded-xl border border-white/10 py-2.5 text-center text-sm font-semibold text-white/60 transition hover:bg-white/5"
            >
              📞 {saha.telefon}
            </a>
          </div>
        )}
      </div>

      <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 text-base font-extrabold text-white">📅 Müsaitlik Durumu</h2>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {gunler.map((gun) => (
            <button
              key={gun}
              onClick={() => setSeciliGun(gun)}
              className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                seciliGun === gun
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-green-500/30'
              }`}
            >
              {tarihFormat(gun)}
            </button>
          ))}
        </div>

        {slotlar.length === 0 ? (
          <p className="text-sm text-white/40">Müsaitlik bilgisi henüz girilmemiş.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {slotlar.map((slot) => {
              const bos = (musaitlik[`${seciliGun}_${slot}`] || 'bos') === 'bos';
              return (
                <div
                  key={slot}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    bos ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
                  }`}
                >
                  <span className="text-sm font-bold text-white">{slot}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${bos ? 'text-green-400' : 'text-red-400'}`}>
                      {bos ? '✅ Boş' : '❌ Dolu'}
                    </span>
                    {bos && saha.telefon && (
                      <a
                        href={whatsappLinki(whatsappNumara, saha.sahaAdi, saha.format || '7v7', tarihFormat(seciliGun), slot)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold text-white transition"
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

      {saha.kurallar && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-base font-extrabold text-white">📋 Saha Kuralları</h2>
          <p className="text-sm leading-relaxed text-white/40">{saha.kurallar}</p>
        </div>
      )}
    </div>
  );
}
