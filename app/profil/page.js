'use client';

import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
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

export default function ProfilPage() {
  const [kullanici, setKullanici] = useState(null);
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basari, setBasari] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = { ...docSnap.data(), uid: user.uid, email: user.email };
        setKullanici(data);
        setForm(data);
      }
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      await updateDoc(doc(db, 'users', kullanici.uid), {
        ad: form.ad,
        mevki: form.mevki,
        baskinAyak: form.baskinAyak,
        seviye: form.seviye,
        ilce: form.ilce,
        yasAraligi: form.yasAraligi,
        bio: form.bio,
      });
      setKullanici({ ...kullanici, ...form });
      setDuzenle(false);
      setBasari(true);
      setTimeout(() => setBasari(false), 3000);
    } catch (err) {
      alert('Bir hata oluştu.');
    }
    setKaydediliyor(false);
  };

  const cikisYap = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (yukleniyor) return (
    <div style={{ maxWidth: 600, margin: '100px auto', padding: 24, textAlign: 'center' }}>
      <p style={{ color: '#6b7c6b' }}>Yükleniyor...</p>
    </div>
  );

  const inputStyle = {
    width: '100%', padding: 10, borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14,
    boxSizing: 'border-box', background: 'white'
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: '#6b7c6b',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block'
  };

  const alanStyle = {
    background: 'white', border: '1.5px solid #dde8dd',
    borderRadius: 12, padding: '16px 20px', marginBottom: 12
  };

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: 24 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <Link href="/" style={{ fontSize: 13, color: '#16a34a', textDecoration: 'none' }}>
          ← Ana Sayfa
        </Link>
        <button onClick={cikisYap} style={{
          padding: '8px 16px', border: '1.5px solid #ddd',
          background: 'white', borderRadius: 8, cursor: 'pointer',
          fontSize: 13, color: '#6b7c6b'
        }}>
          Çıkış Yap
        </button>
      </div>

      {/* PROFİL KARTI */}
      <div style={{
        background: 'white', border: '1.5px solid #dde8dd',
        borderRadius: 16, padding: 24, marginBottom: 20, textAlign: 'center'
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#dcfce7', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 28, margin: '0 auto 12px'
        }}>
          ⚽
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          {kullanici.ad || 'İsimsiz Oyuncu'}
        </h2>
        <p style={{ fontSize: 13, color: '#6b7c6b', marginBottom: 12 }}>
          {kullanici.email}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {kullanici.mevki && (
            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              {kullanici.mevki}
            </span>
          )}
          {kullanici.seviye && (
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              {kullanici.seviye}
            </span>
          )}
          {kullanici.ilce && (
            <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              📍 {kullanici.ilce}
            </span>
          )}
        </div>
        {kullanici.bio && (
          <p style={{ fontSize: 13, color: '#6b7c6b', marginTop: 12, lineHeight: 1.5 }}>
            {kullanici.bio}
          </p>
        )}
      </div>

      {/* BAŞARI MESAJI */}
      {basari && (
        <div style={{
          background: '#f0fdf4', border: '1.5px solid #86efac',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          fontSize: 14, color: '#166534', fontWeight: 600
        }}>
          ✅ Profil güncellendi!
        </div>
      )}

      {/* DÜZENLE / KAYDET BUTON */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {duzenle ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setDuzenle(false)} style={{
              padding: '8px 16px', border: '1.5px solid #ddd',
              background: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 13
            }}>
              İptal
            </button>
            <button onClick={kaydet} disabled={kaydediliyor} style={{
              padding: '8px 16px', background: '#16a34a', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700
            }}>
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        ) : (
          <button onClick={() => setDuzenle(true)} style={{
            padding: '8px 16px', border: '1.5px solid #16a34a', color: '#16a34a',
            background: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>
            ✏️ Düzenle
          </button>
        )}
      </div>

      {/* BİLGİLER */}
      {duzenle ? (
        <div>
          <div style={alanStyle}>
            <label style={labelStyle}>Ad Soyad</label>
            <input
              type="text"
              value={form.ad || ''}
              onChange={e => setForm({ ...form, ad: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={alanStyle}>
            <label style={labelStyle}>Mevki</label>
            <select value={form.mevki || ''} onChange={e => setForm({ ...form, mevki: e.target.value })} style={inputStyle}>
              <option value="">Seç</option>
              <option value="Kaleci">Kaleci</option>
              <option value="Defans">Defans</option>
              <option value="Orta Saha">Orta Saha</option>
              <option value="Forvet">Forvet</option>
            </select>
          </div>
          <div style={alanStyle}>
            <label style={labelStyle}>Baskın Ayak</label>
            <select value={form.baskinAyak || ''} onChange={e => setForm({ ...form, baskinAyak: e.target.value })} style={inputStyle}>
              <option value="">Seç</option>
              <option value="Sağ">Sağ</option>
              <option value="Sol">Sol</option>
              <option value="Her İkisi">Her İkisi</option>
            </select>
          </div>
          <div style={alanStyle}>
            <label style={labelStyle}>Seviye</label>
            <select value={form.seviye || ''} onChange={e => setForm({ ...form, seviye: e.target.value })} style={inputStyle}>
              <option value="">Seç</option>
              <option value="Casual">Casual</option>
              <option value="Orta">Orta</option>
              <option value="İyi">İyi</option>
              <option value="Profesyonel">Profesyonel</option>
            </select>
          </div>
          <div style={alanStyle}>
            <label style={labelStyle}>İlçe</label>
            <select value={form.ilce || ''} onChange={e => setForm({ ...form, ilce: e.target.value })} style={inputStyle}>
              <option value="">Seç</option>
              {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div style={alanStyle}>
            <label style={labelStyle}>Yaş Aralığı</label>
            <select value={form.yasAraligi || ''} onChange={e => setForm({ ...form, yasAraligi: e.target.value })} style={inputStyle}>
              <option value="">Belirtmek istemiyorum</option>
              <option value="18-25">18 — 25</option>
              <option value="25-35">25 — 35</option>
              <option value="35+">35+</option>
            </select>
          </div>
          <div style={alanStyle}>
            <label style={labelStyle}>Hakkında</label>
            <textarea
              value={form.bio || ''}
              onChange={e => setForm({ ...form, bio: e.target.value.slice(0, 160) })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{(form.bio || '').length}/160</p>
          </div>
        </div>
      ) : (
        <div>
          {[
            { label: 'Baskın Ayak', value: kullanici.baskinAyak },
            { label: 'Yaş Aralığı', value: kullanici.yasAraligi },
            { label: 'Email', value: kullanici.email },
          ].map((item, i) => item.value && (
            <div key={i} style={alanStyle}>
              <label style={labelStyle}>{item.label}</label>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}