'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function AnaSayfa() {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

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

  if (yukleniyor) return (
    <div style={{ maxWidth: 800, margin: '100px auto', padding: 24, textAlign: 'center' }}>
      <p style={{ color: '#6b7c6b' }}>Yükleniyor...</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: '60px auto', padding: 24 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
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
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16, lineHeight: 1.3 }}>
          Yakınındaki halı sahaları bul,<br />
          <span style={{ color: '#16a34a' }}>müsait saatleri gör.</span>
        </h2>
        <p style={{ color: '#6b7c6b', fontSize: 16, marginBottom: 28 }}>
          Sahayı bul, WhatsApp'tan rezervasyon yap. Oyuncu ara, takım bul.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/sahalar" style={{
            padding: '12px 28px', background: '#16a34a', color: 'white',
            borderRadius: 8, textDecoration: 'none', fontSize: 16, fontWeight: 700
          }}>
            🏟️ Sahaları Gör
          </Link>
          <Link href="/ilanlar" style={{
            padding: '12px 28px', border: '1.5px solid #16a34a', color: '#16a34a',
            borderRadius: 8, textDecoration: 'none', fontSize: 16, fontWeight: 700
          }}>
            📋 İlan Panosu
          </Link>
        </div>
      </div>

      {/* ÖZELLİKLER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { icon: '🏟️', baslik: 'Sahaları Keşfet', aciklama: 'Çevrendeki sahaları listede gör. Boş saatleri tek bakışta anla.' },
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