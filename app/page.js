'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, limit, Timestamp, getDocs } from 'firebase/firestore';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
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

const kalanSure = (silinmeZamani) => {
  const fark = silinmeZamani.toDate() - new Date();
  const saat = Math.floor(fark / (1000 * 60 * 60));
  const dakika = Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60));
  if (saat <= 0 && dakika <= 0) return 'Süresi doldu';
  if (saat <= 0) return dakika + 'dk kaldı';
  return saat + 'sa kaldı';
};

export default function AnaSayfa() {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sahalar, setSahalar] = useState([]);
  const [ilanlar, setIlanlar] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const futbolcuSnap = await getDoc(doc(db, 'futbolcular', user.uid));
        if (futbolcuSnap.exists()) {
          setKullanici({ ...user, ...futbolcuSnap.data(), tip: 'futbolcu' });
          setYukleniyor(false);
          return;
        }
        const sahaSnap = await getDoc(doc(db, 'sahalar', user.uid));
        if (sahaSnap.exists()) {
          setKullanici({ ...user, ...sahaSnap.data(), tip: 'saha' });
          setYukleniyor(false);
          return;
        }
        setKullanici(user);
      } else {
        setKullanici(null);
      }
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  // Sahaları çek
  useEffect(() => {
    const getir = async () => {
      const q = query(collection(db, 'sahalar'), where('durum', '==', 'aktif'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => {
        const saha = { id: d.id, ...d.data() };
        if (!saha.lat && saha.ilce && ILCE_KOORDINATLARI[saha.ilce]) {
          saha.lat = ILCE_KOORDINATLARI[saha.ilce].lat;
          saha.lng = ILCE_KOORDINATLARI[saha.ilce].lng;
        }
        return saha;
      }).filter(s => s.lat && s.lng);
      setSahalar(data);
    };
    getir();
  }, []);

  // İlanları dinle
  useEffect(() => {
    const simdi = Timestamp.now();
    const q = query(
      collection(db, 'ilanlar'),
      where('silinmeZamani', '>', simdi),
      orderBy('silinmeZamani', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      setIlanlar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  if (yukleniyor) return (
    <div style={{ maxWidth: 800, margin: '100px auto', padding: 24, textAlign: 'center' }}>
      <p style={{ color: '#6b7c6b' }}>Yükleniyor...</p>
    </div>
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 60px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>⚽ HalıSaha</h1>
        <div>
          {kullanici ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 14, color: '#6b7c6b' }}>
                Merhaba, {kullanici.ad || kullanici.displayName || 'Oyuncu'}
              </span>
              <Link href="/profil" style={{
                padding: '8px 16px', background: '#16a34a', color: 'white',
                borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600
              }}>
                Profilim
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/login" style={{
                padding: '8px 16px', border: '1.5px solid #16a34a', color: '#16a34a',
                borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600
              }}>
                Giriş Yap
              </Link>
              <Link href="/kayit" style={{
                padding: '8px 16px', background: '#16a34a', color: 'white',
                borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600
              }}>
                Kayıt Ol
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* HERO */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>
          Yakınındaki halı sahaları bul,<br />
          <span style={{ color: '#16a34a' }}>müsait saatleri gör.</span>
        </h2>
        <p style={{ color: '#6b7c6b', fontSize: 16, marginBottom: 24 }}>
          Sahayı bul, WhatsApp'tan rezervasyon yap. Oyuncu ara, takım bul.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/harita" style={{
            padding: '13px 28px', background: '#16a34a', color: 'white',
            borderRadius: 8, textDecoration: 'none', fontSize: 16, fontWeight: 700
          }}>
            🗺️ Haritada Ara
          </Link>
          <Link href="/ilanlar" style={{
            padding: '13px 28px', border: '1.5px solid #16a34a', color: '#16a34a',
            borderRadius: 8, textDecoration: 'none', fontSize: 16, fontWeight: 700
          }}>
            📋 İlan Panosu
          </Link>
        </div>
      </div>

      {/* HARİTA WIDGET */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>
            🏟️ İstanbul'da {sahalar.length} aktif saha
          </h3>
          <Link href="/harita" style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
            Tümünü haritada gör →
          </Link>
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid #dde8dd', height: 320 }}>
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={ISTANBUL_MERKEZ}
              defaultZoom={10}
              mapId="halisaha-mini-map"
              style={{ width: '100%', height: '100%' }}
              gestureHandling="cooperative"
              disableDefaultUI={true}
            >
              {sahalar.map(saha => (
                <AdvancedMarker
                  key={saha.id}
                  position={{ lat: saha.lat, lng: saha.lng }}
                  onClick={() => window.location.href = '/saha/' + saha.id}
                >
                  <div style={{
                    background: '#16a34a',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: 16,
                    fontSize: 11,
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    border: '2px solid white',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}>
                    🏟️ {saha.sahaAdi}
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </div>
      </div>

      {/* SON İLANLAR */}
      {ilanlar.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>📋 Son İlanlar</h3>
            <Link href="/ilanlar" style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
              Tümünü gör →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ilanlar.map(ilan => (
              <div key={ilan.id} style={{
                background: 'white', border: '1.5px solid #dde8dd',
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      background: ilan.kategori === 'Oyuncu Arıyorum' ? '#dcfce7' : '#dbeafe',
                      color: ilan.kategori === 'Oyuncu Arıyorum' ? '#166534' : '#1e40af',
                      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700
                    }}>
                      {ilan.kategori}
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                      📍 {ilan.ilce}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{ilan.baslik}</p>
                  {ilan.tarih && (
                    <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>🗓 {ilan.tarih} {ilan.saat}</p>
                  )}
                </div>
                <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0, marginLeft: 12 }}>
                  ⏱ {kalanSure(ilan.silinmeZamani)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ÖZELLİKLER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { icon: '🗺️', baslik: 'Haritada Keşfet', aciklama: 'Çevrendeki sahaları harita üzerinde gör. Boş saatler yeşil, dolu saatler kırmızı.' },
          { icon: '📋', baslik: 'İlan Panosu', aciklama: 'Oyuncu ara veya takım bul. İlçene özel ilanları gör.' },
          { icon: '💬', baslik: 'WhatsApp ile Rezervasyon', aciklama: 'Tek tıkla sahaya yaz. Mesajın otomatik hazırlanır.' },
        ].map((item, i) => (
          <div key={i} style={{
            background: 'white', border: '1.5px solid #dde8dd',
            borderRadius: 14, padding: 20
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{item.baslik}</div>
            <div style={{ fontSize: 13, color: '#6b7c6b', lineHeight: 1.5 }}>{item.aciklama}</div>
          </div>
        ))}
      </div>

    </div>
  );
}