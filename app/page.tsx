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
    <div className="max-w-2xl mx-auto mt-24 px-4 text-center">
      <p className="text-gray-500">Yükleniyor...</p>
    </div>
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 pt-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-extrabold text-green-600">⚽ HalıSaha</h1>
        <div>
          {kullanici ? (
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-gray-500">
                Merhaba, {kullanici.ad || kullanici.displayName || 'Oyuncu'}
              </span>
              <Link href="/profil" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition">
                Profilim
              </Link>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg text-sm font-semibold hover:bg-green-50 transition">
                Giriş Yap
              </Link>
              <Link href="/kayit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition">
                Kayıt Ol
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* HERO */}
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 leading-tight">
          Yakınındaki halı sahaları bul,{' '}
          <span className="text-green-600">müsait saatleri gör.</span>
        </h2>
        <p className="text-gray-500 text-base mb-6">
          Sahayı bul, WhatsApp'tan rezervasyon yap. Oyuncu ara, takım bul.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/harita" className="px-6 py-3 bg-green-600 text-white rounded-lg text-base font-bold hover:bg-green-700 transition">
            🗺️ Haritada Ara
          </Link>
          <Link href="/ilanlar" className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-lg text-base font-bold hover:bg-green-50 transition">
            📋 İlan Panosu
          </Link>
        </div>
      </div>

      {/* HARİTA WIDGET */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-extrabold">
            🏟️ İstanbul&apos;da {sahalar.length} aktif saha
          </h3>
          <Link href="/harita" className="text-sm text-green-600 font-semibold hover:underline">
            Tümünü haritada gör →
          </Link>
        </div>
        <div className="rounded-2xl overflow-hidden border border-green-100 h-64 sm:h-80">
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
                  <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-md border-2 border-white cursor-pointer whitespace-nowrap">
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
        <div className="mb-10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-extrabold">📋 Son İlanlar</h3>
            <Link href="/ilanlar" className="text-sm text-green-600 font-semibold hover:underline">
              Tümünü gör →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {ilanlar.map(ilan => (
              <div key={ilan.id} className="bg-white border border-green-100 rounded-xl px-4 py-3 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      ilan.kategori === 'Oyuncu Arıyorum'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ilan.kategori}
                    </span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                      📍 {ilan.ilce}
                    </span>
                  </div>
                  <p className="text-sm font-bold truncate">{ilan.baslik}</p>
                  {ilan.tarih && (
                    <p className="text-xs text-green-600 font-semibold mt-0.5">🗓 {ilan.tarih} {ilan.saat}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  ⏱ {kalanSure(ilan.silinmeZamani)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ÖZELLİKLER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '🗺️', baslik: 'Haritada Keşfet', aciklama: 'Çevrendeki sahaları harita üzerinde gör. Boş saatler yeşil, dolu saatler kırmızı.' },
          { icon: '📋', baslik: 'İlan Panosu', aciklama: 'Oyuncu ara veya takım bul. İlçene özel ilanları gör.' },
          { icon: '💬', baslik: 'WhatsApp ile Rezervasyon', aciklama: 'Tek tıkla sahaya yaz. Mesajın otomatik hazırlanır.' },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-green-100 rounded-2xl p-5">
            <div className="text-3xl mb-3">{item.icon}</div>
            <div className="font-bold text-sm mb-1">{item.baslik}</div>
            <div className="text-xs text-gray-500 leading-relaxed">{item.aciklama}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
