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

const tarihFormat = (tarih) => {
  const d = new Date(tarih + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const saatiDakikayaCevir = (saat) => {
  const parcalar = saat.split(':');
  return Number(parcalar[0]) * 60 + Number(parcalar[1]);
};

const dakikayaSaateCevir = (dakika) => {
  const normalDakika = dakika % (24 * 60);
  const h = Math.floor(normalDakika / 60);
  const m = normalDakika % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
};

const slotlarUret = (acilis, kapanis, slotSuresi) => {
  const slotlar = [];
  let baslangic = saatiDakikayaCevir(acilis);
  let bitis = saatiDakikayaCevir(kapanis);
  if (bitis <= baslangic) {
    bitis = bitis + 24 * 60;
  }
  while (baslangic + slotSuresi <= bitis) {
    const slotBaslangic = dakikayaSaateCevir(baslangic);
    const slotBitis = dakikayaSaateCevir(baslangic + slotSuresi);
    slotlar.push(slotBaslangic + '-' + slotBitis);
    baslangic = baslangic + slotSuresi;
  }
  return slotlar;
};

const formatOyuncuSayisi = { '5v5': 10, '6v6': 12, '7v7': 14, '8v8': 16 };

const whatsappLinki = (numara, sahaAdi, format, gunStr, slot) => {
  const mesaj = 'Merhaba! ' + sahaAdi + ' platformu üzerinden buldum. ' + format + ' sahayı ' + gunStr + ' - ' + slot + ' saati için rezerve etmek istiyorum. Müsait misiniz?';
  return 'https://wa.me/90' + numara + '?text=' + encodeURIComponent(mesaj);
};

const whatsappGenelLink = (numara, sahaAdi) => {
  const mesaj = 'Merhaba! ' + sahaAdi + ' platformu üzerinden buldum. Rezervasyon yapmak istiyorum, müsait misiniz?';
  return 'https://wa.me/90' + numara + '?text=' + encodeURIComponent(mesaj);
};

export default function SahaProfilPage({ params }) {
  const { id } = use(params);
  const [saha, setSaha] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [seciliGun, setSeciliGun] = useState(bugunTarih());
  const gunler = sonrakiGunler();

  useEffect(() => {
    const getir = async () => {
      const docSnap = await getDoc(doc(db, 'sahalar', id));
      if (docSnap.exists()) {
        setSaha({ id: docSnap.id, ...docSnap.data() });
      }
      setYukleniyor(false);
    };
    getir();
  }, [id]);

  if (yukleniyor) {
    return (
      <div style={{ maxWidth: 680, margin: '100px auto', padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#6b7c6b' }}>Yükleniyor...</p>
      </div>
    );
  }

  if (!saha) {
    return (
      <div style={{ maxWidth: 680, margin: '100px auto', padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#6b7c6b' }}>Saha bulunamadı.</p>
        <Link href="/" style={{ color: '#16a34a' }}>Ana sayfaya dön</Link>
      </div>
    );
  }

  const slotlar = saha.acilisSaati && saha.kapanisSaati && saha.slotSuresi
    ? slotlarUret(saha.acilisSaati, saha.kapanisSaati, saha.slotSuresi)
    : [];

  const musaitlik = saha.musaitlik || {};
  const oyuncuSayisi = formatOyuncuSayisi[saha.format] || 14;
  const kisiBasiFiyat = saha.fiyat ? Math.round(saha.fiyat / oyuncuSayisi) : null;
  const whatsappNumara = saha.telefon ? saha.telefon.replace(/\D/g, '') : '';
  const bosSlotSayisi = slotlar.filter(function(s) {
    return (musaitlik[seciliGun + '_' + s] || 'bos') === 'bos';
  }).length;

  return (
    <div style={{ maxWidth: 680, margin: '60px auto', padding: '24px 16px' }}>

      <Link href="/" style={{ fontSize: 13, color: '#16a34a', textDecoration: 'none' }}>
        ← Ana Sayfaya Dön
      </Link>

      <div style={{ background: 'white', border: '1.5px solid #dde8dd', borderRadius: 16, padding: 24, marginTop: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🏟️ {saha.sahaAdi}</h1>
            {saha.ilce && (
              <p style={{ fontSize: 13, color: '#6b7c6b' }}>📍 {saha.ilce}</p>
            )}
          </div>
          <div style={{
            background: bosSlotSayisi > 0 ? '#dcfce7' : '#fef2f2',
            color: bosSlotSayisi > 0 ? '#166534' : '#dc2626',
            padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700
          }}>
            {bosSlotSayisi > 0 ? ('✅ ' + bosSlotSayisi + ' boş slot') : '❌ Dolu'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
          {saha.format && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', marginBottom: 2 }}>FORMAT</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{saha.format}</div>
            </div>
          )}
          {saha.fiyat && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', marginBottom: 2 }}>SAATLİK</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{saha.fiyat} ₺</div>
            </div>
          )}
          {kisiBasiFiyat && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', marginBottom: 2 }}>KİŞİ BAŞI</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{kisiBasiFiyat} ₺</div>
            </div>
          )}
          {saha.acilisSaati && saha.kapanisSaati && (
            <div style={{ background: '#f8fafc', border: '1.5px solid #dde8dd', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7c6b', marginBottom: 2 }}>ÇALIŞMA</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{saha.acilisSaati} - {saha.kapanisSaati}</div>
            </div>
          )}
        </div>

        {saha.telefon && (
          <a
            href={whatsappGenelLink(whatsappNumara, saha.sahaAdi)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', width: '100%', padding: 13,
              background: '#25D366', color: 'white', borderRadius: 10,
              fontSize: 15, fontWeight: 700, textAlign: 'center',
              textDecoration: 'none', boxSizing: 'border-box', marginBottom: 8
            }}
          >
            💬 WhatsApp ile İletişime Geç
          </a>
        )}

        {saha.telefon && (
          <a
            href={'tel:' + saha.telefon}
            style={{
              display: 'block', width: '100%', padding: 11,
              border: '1.5px solid #dde8dd', color: '#374137', borderRadius: 10,
              fontSize: 13, fontWeight: 600, textAlign: 'center',
              textDecoration: 'none', boxSizing: 'border-box'
            }}
          >
            📞 {saha.telefon}
          </a>
        )}
      </div>

      <div style={{ background: 'white', border: '1.5px solid #dde8dd', borderRadius: 16, padding: 24, marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>📅 Müsaitlik Durumu</h2>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {gunler.map(function(gun) {
            return (
              <button
                key={gun}
                onClick={function() { setSeciliGun(gun); }}
                style={{
                  padding: '7px 11px', borderRadius: 10, border: '1.5px solid',
                  borderColor: seciliGun === gun ? '#16a34a' : '#dde8dd',
                  background: seciliGun === gun ? '#16a34a' : 'white',
                  color: seciliGun === gun ? 'white' : '#374137',
                  cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  whiteSpace: 'nowrap', flexShrink: 0
                }}
              >
                {tarihFormat(gun)}
              </button>
            );
          })}
        </div>

        {slotlar.length === 0 ? (
          <p style={{ color: '#6b7c6b', fontSize: 13 }}>Müsaitlik bilgisi henüz girilmemiş.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slotlar.map(function(slot) {
              const anahtar = seciliGun + '_' + slot;
              const durum = musaitlik[anahtar] || 'bos';
              const bos = durum === 'bos';
              return (
                <div
                  key={slot}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 10, border: '1.5px solid',
                    borderColor: bos ? '#86efac' : '#fecaca',
                    background: bos ? '#f0fdf4' : '#fef2f2'
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{slot}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: bos ? '#16a34a' : '#dc2626' }}>
                      {bos ? '✅ Boş' : '❌ Dolu'}
                    </span>
                    {bos && saha.telefon && (
                      <a
                        href={whatsappLinki(whatsappNumara, saha.sahaAdi, saha.format, tarihFormat(seciliGun), slot)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#25D366', color: 'white',
                          padding: '4px 10px', borderRadius: 8,
                          fontSize: 11, fontWeight: 700,
                          textDecoration: 'none', whiteSpace: 'nowrap'
                        }}
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
        <div style={{ background: 'white', border: '1.5px solid #dde8dd', borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>📋 Saha Kuralları</h2>
          <p style={{ fontSize: 13, color: '#6b7c6b', lineHeight: 1.6 }}>{saha.kurallar}</p>
        </div>
      )}

    </div>
  );
}
