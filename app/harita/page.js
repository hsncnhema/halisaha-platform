'use client';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import Link from 'next/link';

const ISTANBUL_MERKEZ = { lat: 41.0082, lng: 28.9784 };

const ILCE_KOORDINATLARI = {
  'Adalar': { lat: 40.8713, lng: 29.1253 },
  'Arnavutköy': { lat: 41.1853, lng: 28.7397 },
  'Ataşehir': { lat: 40.9833, lng: 29.1167 },
  'Avcılar': { lat: 40.9798, lng: 28.7219 },
  'Bağcılar': { lat: 41.0397, lng: 28.8561 },
  'Bahçelievler': { lat: 40.9997, lng: 28.8519 },
  'Bakırköy': { lat: 40.9819, lng: 28.8719 },
  'Başakşehir': { lat: 41.0942, lng: 28.8019 },
  'Bayrampaşa': { lat: 41.0453, lng: 28.9153 },
  'Beşiktaş': { lat: 41.0422, lng: 29.0061 },
  'Beykoz': { lat: 41.1333, lng: 29.1167 },
  'Beylikdüzü': { lat: 40.9819, lng: 28.6419 },
  'Beyoğlu': { lat: 41.0333, lng: 28.9833 },
  'Büyükçekmece': { lat: 41.0219, lng: 28.5819 },
  'Çatalca': { lat: 41.1433, lng: 28.4619 },
  'Çekmeköy': { lat: 41.0319, lng: 29.1819 },
  'Esenler': { lat: 41.0433, lng: 28.8753 },
  'Esenyurt': { lat: 41.0319, lng: 28.6753 },
  'Eyüpsultan': { lat: 41.0753, lng: 28.9319 },
  'Fatih': { lat: 41.0186, lng: 28.9397 },
  'Gaziosmanpaşa': { lat: 41.0653, lng: 28.9119 },
  'Güngören': { lat: 41.0219, lng: 28.8719 },
  'Kadıköy': { lat: 40.9819, lng: 29.0819 },
  'Kağıthane': { lat: 41.0753, lng: 28.9719 },
  'Kartal': { lat: 40.9053, lng: 29.1853 },
  'Küçükçekmece': { lat: 41.0019, lng: 28.7719 },
  'Maltepe': { lat: 40.9353, lng: 29.1319 },
  'Pendik': { lat: 40.8753, lng: 29.2319 },
  'Sancaktepe': { lat: 41.0019, lng: 29.2219 },
  'Sarıyer': { lat: 41.1653, lng: 29.0519 },
  'Silivri': { lat: 41.0733, lng: 28.2453 },
  'Sultanbeyli': { lat: 40.9619, lng: 29.2653 },
  'Sultangazi': { lat: 41.1053, lng: 28.8719 },
  'Şile': { lat: 41.1753, lng: 29.6119 },
  'Şişli': { lat: 41.0653, lng: 28.9919 },
  'Tuzla': { lat: 40.8153, lng: 29.2953 },
  'Ümraniye': { lat: 41.0153, lng: 29.1253 },
  'Üsküdar': { lat: 41.0253, lng: 29.0153 },
  'Zeytinburnu': { lat: 41.0019, lng: 28.9019 },
};

export default function HaritaPage() {
  const [sahalar, setSahalar] = useState([]);
  const [seciliSaha, setSeciliSaha] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState({ format: '' });

  useEffect(() => {
    const getir = async () => {
      const q = query(collection(db, 'sahalar'), where('durum', '==', 'aktif'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => {
        const saha = { id: d.id, ...d.data() };
        // Koordinat yoksa ilçe koordinatını kullan
        if (!saha.lat && saha.ilce && ILCE_KOORDINATLARI[saha.ilce]) {
          saha.lat = ILCE_KOORDINATLARI[saha.ilce].lat;
          saha.lng = ILCE_KOORDINATLARI[saha.ilce].lng;
        }
        return saha;
      }).filter(s => s.lat && s.lng);
      setSahalar(data);
      setYukleniyor(false);
    };
    getir();
  }, []);

  const bugunTarih = new Date().toISOString().split('T')[0];

  const bosSlotSayisi = (saha) => {
    if (!saha.acilisSaati || !saha.kapanisSaati || !saha.slotSuresi) return null;
    const musaitlik = saha.musaitlik || {};
    let baslangic = saatiDakika(saha.acilisSaati);
    let bitis = saatiDakika(saha.kapanisSaati);
    if (bitis <= baslangic) bitis += 24 * 60;
    let bos = 0;
    let toplam = 0;
    while (baslangic + saha.slotSuresi <= bitis) {
      const s = dakikaSaat(baslangic);
      const b = dakikaSaat(baslangic + saha.slotSuresi);
      const slot = s + '-' + b;
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

  const filtrelenmis = sahalar.filter(s => {
    if (filtre.format && s.format !== filtre.format) return false;
    return true;
  });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #dde8dd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ fontSize: 13, color: '#16a34a', textDecoration: 'none' }}>← Ana Sayfa</Link>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>🗺️ Halı Sahalar</h1>
          <span style={{ fontSize: 12, color: '#6b7c6b' }}>{filtrelenmis.length} saha</span>
        </div>
        <select
          value={filtre.format}
          onChange={e => setFiltre({ format: e.target.value })}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #dde8dd', fontSize: 13, background: 'white', cursor: 'pointer' }}
        >
          <option value="">Tüm Formatlar</option>
          <option value="5v5">5v5</option>
          <option value="6v6">6v6</option>
          <option value="7v7">7v7</option>
          <option value="8v8">8v8</option>
        </select>
      </div>

      {/* HARİTA */}
      <div style={{ flex: 1, position: 'relative' }}>
        {yukleniyor ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ color: '#6b7c6b' }}>Yükleniyor...</p>
          </div>
        ) : (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={ISTANBUL_MERKEZ}
              defaultZoom={11}
              mapId="halisaha-map"
              style={{ width: '100%', height: '100%' }}
              gestureHandling="greedy"
              disableDefaultUI={false}
            >
              {filtrelenmis.map(saha => {
                const slots = bosSlotSayisi(saha);
                const bos = slots ? slots.bos > 0 : true;
                return (
                  <AdvancedMarker
                    key={saha.id}
                    position={{ lat: saha.lat, lng: saha.lng }}
                    onClick={() => setSeciliSaha(saha)}
                  >
                    <div style={{
                      background: bos ? '#16a34a' : '#dc2626',
                      color: 'white',
                      padding: '5px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      border: '2px solid white'
                    }}>
                      🏟️ {saha.sahaAdi}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {seciliSaha && (
                <InfoWindow
                  position={{ lat: seciliSaha.lat, lng: seciliSaha.lng }}
                  onCloseClick={() => setSeciliSaha(null)}
                >
                  <div style={{ padding: 8, minWidth: 200 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>🏟️ {seciliSaha.sahaAdi}</h3>
                    {seciliSaha.ilce && <p style={{ fontSize: 12, color: '#6b7c6b', marginBottom: 4 }}>📍 {seciliSaha.ilce}</p>}
                    {seciliSaha.format && <p style={{ fontSize: 12, marginBottom: 4 }}>⚽ {seciliSaha.format}</p>}
                    {seciliSaha.fiyat && <p style={{ fontSize: 12, marginBottom: 8 }}>💰 {seciliSaha.fiyat} ₺ / saat</p>}
                    <a
                      href={'/saha/' + seciliSaha.id}
                      style={{
                        display: 'block', padding: '7px 12px',
                        background: '#16a34a', color: 'white',
                        borderRadius: 8, textDecoration: 'none',
                        fontSize: 12, fontWeight: 700, textAlign: 'center'
                      }}
                    >
                      Sahayı Gör →
                    </a>
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