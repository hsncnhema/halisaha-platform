'use client';

import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ILCELER = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu'
];

export default function ProfilTamamlaPage() {
  const [mevki, setMevki] = useState('');
  const [baskinAyak, setBaskinAyak] = useState('');
  const [seviye, setSeviye] = useState('');
  const [ilce, setIlce] = useState('');
  const [yasAraligi, setYasAraligi] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const router = useRouter();

  const kaydet = async (e) => {
    e.preventDefault();
    if (!mevki || !seviye || !ilce) {
      setError('Mevki, seviye ve ilçe zorunludur.');
      return;
    }
    setYukleniyor(true);
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, 'futbolcular', user.uid), {
        mevki,
        baskinAyak,
        seviye,
        ilce,
        yasAraligi,
        bio,
        profilTamamlandi: true,
      });
      router.push('/');
    } catch (err) {
      setError('Bir hata oluştu, tekrar dene.');
    }
    setYukleniyor(false);
  };

  const inputStyle = {
    width: '100%', padding: 12, marginBottom: 12,
    borderRadius: 8, border: '1px solid #ddd',
    fontSize: 15, boxSizing: 'border-box', background: 'white'
  };

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#374137', marginBottom: 4
  };

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>⚽ Profili Tamamla</h1>
      <p style={{ color: '#6b7c6b', fontSize: 14, marginBottom: 28 }}>
        Diğer oyuncular seni tanısın. Yıldız (*) ile işaretli alanlar zorunludur.
      </p>

      <form onSubmit={kaydet}>
        <label style={labelStyle}>Mevki *</label>
        <select value={mevki} onChange={e => setMevki(e.target.value)} style={inputStyle}>
          <option value="">Seç</option>
          <option value="Kaleci">Kaleci</option>
          <option value="Defans">Defans</option>
          <option value="Orta Saha">Orta Saha</option>
          <option value="Forvet">Forvet</option>
        </select>

        <label style={labelStyle}>Baskın Ayak</label>
        <select value={baskinAyak} onChange={e => setBaskinAyak(e.target.value)} style={inputStyle}>
          <option value="">Seç</option>
          <option value="Sağ">Sağ</option>
          <option value="Sol">Sol</option>
          <option value="Her İkisi">Her İkisi</option>
        </select>

        <label style={labelStyle}>Seviye *</label>
        <select value={seviye} onChange={e => setSeviye(e.target.value)} style={inputStyle}>
          <option value="">Seç</option>
          <option value="Casual">Casual — Eğlence amaçlı</option>
          <option value="Orta">Orta — Düzenli oynuyorum</option>
          <option value="İyi">İyi — Rekabetçi oynuyorum</option>
          <option value="Profesyonel">Profesyonel</option>
        </select>

        <label style={labelStyle}>İlçe *</label>
        <select value={ilce} onChange={e => setIlce(e.target.value)} style={inputStyle}>
          <option value="">Seç</option>
          {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
        </select>

        <label style={labelStyle}>Yaş Aralığı</label>
        <select value={yasAraligi} onChange={e => setYasAraligi(e.target.value)} style={inputStyle}>
          <option value="">Belirtmek istemiyorum</option>
          <option value="18-25">18 — 25</option>
          <option value="25-35">25 — 35</option>
          <option value="35+">35+</option>
        </select>

        <label style={labelStyle}>Hakkında (opsiyonel)</label>
        <textarea
          placeholder="Kendinden kısaca bahset... (maks. 160 karakter)"
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, 160))}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <p style={{ fontSize: 11, color: '#aaa', marginTop: -8, marginBottom: 12 }}>
          {bio.length}/160
        </p>

        {error && <p style={{ color: 'red', fontSize: 14, marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={yukleniyor} style={{
          width: '100%', padding: 13,
          background: yukleniyor ? '#aaa' : '#16a34a',
          color: 'white', border: 'none', borderRadius: 8,
          cursor: yukleniyor ? 'not-allowed' : 'pointer',
          fontSize: 16, fontWeight: 700
        }}>
          {yukleniyor ? 'Kaydediliyor...' : 'Profili Tamamla →'}
        </button>
      </form>
    </div>
  );
}