'use client';

import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const ILCELER = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu'
];

export default function SahalarPage() {
  const [sahalar, setSahalar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState({ ilce: '', format: '' });

  useEffect(() => {
    const q = query(collection(db, 'sahalar'), where('durum', '==', 'aktif'));
    const unsub = onSnapshot(q, (snap) => {
      setSahalar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  const filtrelenmis = sahalar.filter(s => {
    if (filtre.ilce && s.ilce !== filtre.ilce) return false;
    if (filtre.format && s.format !== filtre.format) return false;
    return true;
  });

  const bugunTarih = new Date().toISOString().split('T')[0];

  const bosSlotSayisi = (saha) => {
    if (!saha.acilisSaati || !saha.kapanisSaati || !saha.slotSuresi) return null;
    const musaitlik = saha.musaitlik || {};
    let baslangic = saatiDakika(saha.acilisSaati);
    let bitis = saatiDakika(saha.kapanisSaati);
    if (bitis <= baslangic) bitis += 24 * 60;
    let toplam = 0;
    let bos = 0;
    while (baslangic + saha.slotSuresi <= bitis) {
      const slotBaslangic = dakikaSaat(baslangic);
      const slotBitis = dakikaSaat(baslangic + saha.slotSuresi);
      const slot = slotBaslangic + '-' + slotBitis;
      toplam++;
      if ((musaitlik[bugunTarih + '_' + slot] || 'bos') === 'bos') bos++;
      baslangic += saha.slotSuresi;
    }
    return { bos, toplam };
  };

  const saatiDakika = (saat) => {
    const p = saat.split(':');
    return Number(p[0]) * 60 + Number(p[1]);
  };

  const dakikaSaat = (dakika) => {
    const n = dakika % (24 * 60);
    return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  };

  return (
    <div style={{ maxWidth: 800, margin: '60px auto', padding: '24px 16px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <Link href="/" style={{ fontSize: 13, color: '#16a34a', textDecoration: 'none' }}>← Ana Sayfa</Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>🏟️ Halı Sahalar</h1>
        </div>
        <span style={{ fontSize: 13, color: '#6b7c6b' }}>{filtrelenmis.length} saha</span>
      </div>

      {/* FİLTRE */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select
          value={filtre.ilce}
          onChange={e => setFiltre({ ...filtre, ilce: e.target.value })}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #dde8dd', fontSize: 13, background: 'white', cursor: 'pointer' }}
        >
          <option value="">Tüm İlçeler</option>
          {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select
          value={filtre.format}
          onChange={e => setFiltre({ ...filtre, format: e.target.value })}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #dde8dd', fontSize: 13, background: 'white', cursor: 'pointer' }}
        >
          <option value="">Tüm Formatlar</option>
          <option value="5v5">5v5</option>
          <option value="6v6">6v6</option>
          <option value="7v7">7v7</option>
          <option value="8v8">8v8</option>
        </select>
        {(filtre.ilce || filtre.format) && (
          <button
            onClick={() => setFiltre({ ilce: '', format: '' })}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Filtreyi Temizle ✕
          </button>
        )}
      </div>

      {/* SAHA LİSTESİ */}
      {yukleniyor ? (
        <p style={{ textAlign: 'center', color: '#6b7c6b' }}>Yükleniyor...</p>
      ) : filtrelenmis.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'white', borderRadius: 14, border: '1.5px solid #dde8dd', color: '#6b7c6b' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🏟️</p>
          <p style={{ fontWeight: 600 }}>Bu kriterlere uygun saha bulunamadı</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Filtreyi değiştirmeyi dene</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrelenmis.map(saha => {
            const slots = bosSlotSayisi(saha);
            return (
              <Link
                key={saha.id}
                href={'/saha/' + saha.id}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  background: 'white', border: '1.5px solid #dde8dd',
                  borderRadius: 14, padding: 20, cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>🏟️ {saha.sahaAdi}</h3>
                      {saha.ilce && (
                        <p style={{ fontSize: 13, color: '#6b7c6b' }}>📍 {saha.ilce}</p>
                      )}
                    </div>
                    {slots && (
                      <div style={{
                        background: slots.bos > 0 ? '#dcfce7' : '#fef2f2',
                        color: slots.bos > 0 ? '#166534' : '#dc2626',
                        padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {slots.bos > 0 ? ('✅ ' + slots.bos + ' boş slot') : '❌ Bugün dolu'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {saha.format && (
                      <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {saha.format}
                      </span>
                    )}
                    {saha.fiyat && (
                      <span style={{ background: '#f8fafc', color: '#475569', border: '1.5px solid #dde8dd', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                        {saha.fiyat} ₺ / saat
                      </span>
                    )}
                    {saha.acilisSaati && saha.kapanisSaati && (
                      <span style={{ background: '#f8fafc', color: '#475569', border: '1.5px solid #dde8dd', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
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