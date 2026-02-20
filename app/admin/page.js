'use client';

import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, Timestamp
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
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

const SAAT_SECENEKLERI = [
  '06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30',
  '18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30',
  '22:00','22:30','23:00','23:30','00:00','00:30','01:00','01:30','02:00'
];

const bosForm = {
  sahaAdi: '', telefon: '', email: '', ilce: '',
  format: '7v7', fiyat: '', acilisSaati: '09:00',
  kapanisSaati: '23:00', slotSuresi: 60, kurallar: ''
};

export default function AdminPage() {
  const [kullanici, setKullanici] = useState(null);
  const [bekleyenSahalar, setBekleyenSahalar] = useState([]);
  const [aktifSahalar, setAktifSahalar] = useState([]);
  const [futbolcular, setFutbolcular] = useState([]);
  const [ilanlar, setIlanlar] = useState([]);
  const [aktifSekme, setAktifSekme] = useState('basvurular');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sahaFormAcik, setSahaFormAcik] = useState(false);
  const [sahaForm, setSahaForm] = useState(bosForm);
  const [sahaEkleniyor, setSahaEkleniyor] = useState(false);
  const [basari, setBasari] = useState('');
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
    const q1 = query(collection(db, 'sahalar'), where('durum', '==', 'beklemede'));
    const unsub1 = onSnapshot(q1, (snap) => {
      setBekleyenSahalar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const q2 = query(collection(db, 'sahalar'), where('durum', '==', 'aktif'));
    const unsub2 = onSnapshot(q2, (snap) => {
      setAktifSahalar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub3 = onSnapshot(collection(db, 'futbolcular'), (snap) => {
      setFutbolcular(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
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

  const sahaEkle = async (e) => {
    e.preventDefault();
    if (!sahaForm.sahaAdi || !sahaForm.telefon || !sahaForm.ilce) {
      alert('Saha adı, telefon ve ilçe zorunludur.');
      return;
    }
    setSahaEkleniyor(true);
    try {
      await addDoc(collection(db, 'sahalar'), {
        ...sahaForm,
        fiyat: Number(sahaForm.fiyat),
        slotSuresi: Number(sahaForm.slotSuresi),
        durum: 'aktif',
        kurulumTamamlandi: true,
        olusturulma: Timestamp.now(),
      });
      setSahaForm(bosForm);
      setSahaFormAcik(false);
      setBasari('Saha eklendi!');
      setAktifSekme('sahalar');
      setTimeout(() => setBasari(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Hata oluştu.');
    }
    setSahaEkleniyor(false);
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

  const inputStyle = {
    width: '100%', padding: 10, borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14,
    boxSizing: 'border-box', background: 'white', marginBottom: 10
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 700, color: '#6b7c6b',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 4, display: 'block'
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>🛡️ Admin Paneli</h1>
          <p style={{ fontSize: 12, color: '#6b7c6b' }}>{kullanici?.email}</p>
        </div>
        <Link href="/" style={{ fontSize: 13, color: '#16a34a', textDecoration: 'none' }}>← Ana Sayfa</Link>
      </div>

      {basari && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#166534', fontWeight: 600 }}>
          ✅ {basari}
        </div>
      )}

      {/* İSTATİSTİKLER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Bekleyen', value: bekleyenSahalar.length, renk: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
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
                    <button onClick={() => sahaOnayla(saha.id)} style={{ padding: '8px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                      ✅ Onayla
                    </button>
                    <button onClick={() => sahaReddet(saha.id)} style={{ padding: '8px 20px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                      ❌ Reddet
                    </button>
                    <Link href={'/saha/' + saha.id} target="_blank" style={{ padding: '8px 16px', background: '#f0f7f0', color: '#16a34a', border: '1.5px solid #dde8dd', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
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
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setSahaFormAcik(!sahaFormAcik)} style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
              {sahaFormAcik ? 'İptal' : '+ Saha Ekle'}
            </button>
          </div>

          {sahaFormAcik && (
            <div style={{ background: 'white', border: '1.5px solid #86efac', borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Yeni Saha Ekle</h3>
              <form onSubmit={sahaEkle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Saha Adı *</label>
                    <input type="text" value={sahaForm.sahaAdi} onChange={e => setSahaForm({ ...sahaForm, sahaAdi: e.target.value })} style={inputStyle} placeholder="örn: Kadıköy Arena" />
                  </div>
                  <div>
                    <label style={labelStyle}>Telefon / WhatsApp *</label>
                    <input type="tel" value={sahaForm.telefon} onChange={e => setSahaForm({ ...sahaForm, telefon: e.target.value })} style={inputStyle} placeholder="05xx xxx xx xx" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={sahaForm.email} onChange={e => setSahaForm({ ...sahaForm, email: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>İlçe *</label>
                    <select value={sahaForm.ilce} onChange={e => setSahaForm({ ...sahaForm, ilce: e.target.value })} style={inputStyle}>
                      <option value="">Seç</option>
                      {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Format</label>
                    <select value={sahaForm.format} onChange={e => setSahaForm({ ...sahaForm, format: e.target.value })} style={inputStyle}>
                      <option value="5v5">5v5</option>
                      <option value="6v6">6v6</option>
                      <option value="7v7">7v7</option>
                      <option value="8v8">8v8</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Saatlik Fiyat (₺)</label>
                    <input type="number" value={sahaForm.fiyat} onChange={e => setSahaForm({ ...sahaForm, fiyat: e.target.value })} style={inputStyle} placeholder="örn: 3500" />
                  </div>
                  <div>
                    <label style={labelStyle}>Açılış Saati</label>
                    <select value={sahaForm.acilisSaati} onChange={e => setSahaForm({ ...sahaForm, acilisSaati: e.target.value })} style={inputStyle}>
                      {SAAT_SECENEKLERI.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Kapanış Saati</label>
                    <select value={sahaForm.kapanisSaati} onChange={e => setSahaForm({ ...sahaForm, kapanisSaati: e.target.value })} style={inputStyle}>
                      {SAAT_SECENEKLERI.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Slot Süresi</label>
                    <select value={sahaForm.slotSuresi} onChange={e => setSahaForm({ ...sahaForm, slotSuresi: e.target.value })} style={inputStyle}>
                      <option value={60}>60 dakika</option>
                      <option value={90}>90 dakika</option>
                    </select>
                  </div>
                </div>
                <label style={labelStyle}>Kurallar / Notlar</label>
                <textarea value={sahaForm.kurallar} onChange={e => setSahaForm({ ...sahaForm, kurallar: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Sahaya özel bilgilendirme..." />
                <button type="submit" disabled={sahaEkleniyor} style={{ width: '100%', padding: 12, background: sahaEkleniyor ? '#aaa' : '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: sahaEkleniyor ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700 }}>
                  {sahaEkleniyor ? 'Ekleniyor...' : 'Sahayı Ekle ve Yayınla'}
                </button>
              </form>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aktifSahalar.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7c6b', padding: 48 }}>Henüz aktif saha yok.</p>
            ) : aktifSahalar.map(saha => (
              <div key={saha.id} style={{ background: 'white', border: '1.5px solid #dde8dd', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>🏟️ {saha.sahaAdi}</p>
                  <p style={{ fontSize: 12, color: '#6b7c6b' }}>{saha.ilce} — {saha.format} — {saha.fiyat ? saha.fiyat + ' ₺' : 'Fiyat yok'}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={'/saha/' + saha.id} target="_blank" style={{ padding: '6px 12px', background: '#f0f7f0', color: '#16a34a', border: '1.5px solid #dde8dd', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    Gör →
                  </Link>
                  <button onClick={() => sahaDeaktif(saha.id)} style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Deaktif Et
                  </button>
                </div>
              </div>
            ))}
          </div>
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
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: f.profilTamamlandi ? '#dcfce7' : '#fef9c3', color: f.profilTamamlandi ? '#166534' : '#713f12' }}>
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
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#166534' }}>
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
