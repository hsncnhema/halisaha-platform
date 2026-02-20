'use client';

import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDocs
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminPage() {
  const [kullanici, setKullanici] = useState(null);
  const [bekleyenSahalar, setBekleyenSahalar] = useState([]);
  const [aktifSahalar, setAktifSahalar] = useState([]);
  const [futbolcular, setFutbolcular] = useState([]);
  const [ilanlar, setIlanlar] = useState([]);
  const [aktifSekme, setAktifSekme] = useState('basvurular');
  const [yukleniyor, setYukleniyor] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      setKullanici(user);
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Bekleyen sahalar
    const q1 = query(collection(db, 'sahalar'), where('durum', '==', 'beklemede'));
    const unsub1 = onSnapshot(q1, (snap) => {
      setBekleyenSahalar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Aktif sahalar
    const q2 = query(collection(db, 'sahalar'), where('durum', '==', 'aktif'));
    const unsub2 = onSnapshot(q2, (snap) => {
      setAktifSahalar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Futbolcular
    const unsub3 = onSnapshot(collection(db, 'futbolcular'), (snap) => {
      setFutbolcular(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // İlanlar
    const unsub4 = onSnapshot(collection(db, 'ilanlar'), (snap) => {
      setIlanlar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  const sahaOnayla = async (id) => {
    await updateDoc(doc(db, 'sahalar', id), { durum: 'aktif' });
  };

  const sahaReddet = async (id) => {
    await updateDoc(doc(db, 'sahalar', id), { durum: 'reddedildi' });
  };

  const sahaDeaktif = async (id) => {
    await updateDoc(doc(db, 'sahalar', id), { durum: 'beklemede' });
  };

  if (yukleniyor) return (
    <div style={{ maxWidth: 900, margin: '100px auto', padding: 24, textAlign: 'center' }}>
      <p style={{ color: '#6b7c6b' }}>Yükleniyor...</p>
    </div>
  );

  const sekmeStyle = (id) => ({
    padding: '10px 16px', border: 'none', borderRadius: 8,
    cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: aktifSekme === id ? 'white' : 'transparent',
    color: aktifSekme === id ? '#16a34a' : '#6b7c6b',
    boxShadow: aktifSekme === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
  });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>🛡️ Admin Paneli</h1>
          <p style={{ fontSize: 12, color: '#6b7c6b' }}>{kullanici?.email}</p>
        </div>
        <Link href="/" style={{ fontSize: 13, color: '#16a34a', textDecoration: 'none' }}>
          ← Ana Sayfa
        </Link>
      </div>

      {/* İSTATİSTİKLER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Bekleyen Saha', value: bekleyenSahalar.length, renk: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
          { label: 'Aktif Saha', value: aktifSahalar.length, renk: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
          { label: 'Futbolcu', value: futbolcular.length, renk: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'Aktif İlan', value: ilanlar.length, renk: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
        ].map((item, i) => (
          <div key={i} style={{ background: item.bg, border: '1.5px solid ' + item.border, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: item.renk }}>{item.value}</div>
            <div style={{ fontSize: 11, color: '#6b7c6b', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* SEKMELER */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f0f7f0', borderRadius: 10, padding: 4 }}>
        {[
          { id: 'basvurular', label: '🕐 Başvurular (' + bekleyenSahalar.length + ')' },
          { id: 'sahalar', label: '🏟️ Aktif Sahalar' },
          { id: 'kullanicilar', label: '⚽ Kullanıcılar' },
          { id: 'ilanlar', label: '📋 İlanlar' },
        ].map(s => (
          <button key={s.id} onClick={() => setAktifSekme(s.id)} style={sekmeStyle(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* BAŞVURULAR */}
      {aktifSekme === 'basvurular' && (
        <div>
          {bekleyenSahalar.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, background: 'white', borderRadius: 14, border: '1.5px solid #dde8dd', color: '#6b7c6b' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
              <p style={{ fontWeight: 600 }}>Bekleyen başvuru yok</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bekleyenSahalar.map(saha => (
                <div key={saha.id} style={{ background: 'white', border: '1.5px solid #fde68a', borderRadius: 12, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>🏟️ {saha.sahaAdi}</h3>
                      <p style={{ fontSize: 13, color: '#6b7c6b', marginBottom: 2 }}>📧 {saha.email}</p>
                      <p style={{ fontSize: 13, color: '#6b7c6b', marginBottom: 2 }}>📞 {saha.telefon}</p>
                      {saha.ilce && <p style={{ fontSize: 13, color: '#6b7c6b' }}>📍 {saha.ilce}</p>}
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7c6b' }}>
                      {saha.olusturulma?.toDate?.()?.toLocaleDateString('tr-TR') || ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => sahaOnayla(saha.id)}
                      style={{
                        padding: '8px 20px', background: '#16a34a', color: 'white',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700
                      }}
                    >
                      ✅ Onayla
                    </button>
                    <button
                      onClick={() => sahaReddet(saha.id)}
                      style={{
                        padding: '8px 20px', background: '#fef2f2', color: '#dc2626',
                        border: '1.5px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700
                      }}
                    >
                      ❌ Reddet
                    </button>
                    <Link
                      href={'/saha/' + saha.id}
                      target="_blank"
                      style={{
                        padding: '8px 16px', background: '#f0f7f0', color: '#16a34a',
                        border: '1.5px solid #dde8dd', borderRadius: 8, fontSize: 13,
                        fontWeight: 600, textDecoration: 'none'
                      }}
                    >
                      Profili Gör →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AKTİF SAHALAR */}
      {aktifSekme === 'sahalar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {aktifSahalar.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7c6b', padding: 48 }}>Henüz aktif saha yok.</p>
          ) : aktifSahalar.map(saha => (
            <div key={saha.id} style={{ background: 'white', border: '1.5px solid #dde8dd', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>🏟️ {saha.sahaAdi}</p>
                <p style={{ fontSize: 12, color: '#6b7c6b' }}>{saha.email} — {saha.ilce}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href={'/saha/' + saha.id} target="_blank" style={{
                  padding: '6px 12px', background: '#f0f7f0', color: '#16a34a',
                  border: '1.5px solid #dde8dd', borderRadius: 8, fontSize: 12,
                  fontWeight: 600, textDecoration: 'none'
                }}>
                  Gör →
                </Link>
                <button onClick={() => sahaDeaktif(saha.id)} style={{
                  padding: '6px 12px', background: '#fef2f2', color: '#dc2626',
                  border: '1.5px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}>
                  Deaktif Et
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KULLANICILAR */}
      {aktifSekme === 'kullanicilar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {futbolcular.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7c6b', padding: 48 }}>Henüz kayıtlı futbolcu yok.</p>
          ) : futbolcular.map(f => (
            <div key={f.id} style={{ background: 'white', border: '1.5px solid #dde8dd', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>⚽ {f.ad || 'İsimsiz'}</p>
                <p style={{ fontSize: 12, color: '#6b7c6b' }}>{f.email} — {f.ilce} — {f.mevki}</p>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: f.profilTamamlandi ? '#dcfce7' : '#fef9c3',
                color: f.profilTamamlandi ? '#166534' : '#713f12'
              }}>
                {f.profilTamamlandi ? 'Profil Tam' : 'Eksik Profil'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* İLANLAR */}
      {aktifSekme === 'ilanlar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ilanlar.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7c6b', padding: 48 }}>Henüz ilan yok.</p>
          ) : ilanlar.map(ilan => (
            <div key={ilan.id} style={{ background: 'white', border: '1.5px solid #dde8dd', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: '#dcfce7', color: '#166534'
                }}>
                  {ilan.kategori}
                </span>
                <span style={{ fontSize: 11, color: '#6b7c6b' }}>📍 {ilan.ilce}</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{ilan.baslik}</p>
              <p style={{ fontSize: 12, color: '#6b7c6b' }}>{ilan.aciklama}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}