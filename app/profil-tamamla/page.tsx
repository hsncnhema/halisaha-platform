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

const selectClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 bg-white";

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

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mevki || !seviye || !ilce) {
      setError('Mevki, seviye ve ilçe zorunludur.');
      return;
    }
    setYukleniyor(true);
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, 'futbolcular', user!.uid), {
        mevki, baskinAyak, seviye, ilce, yasAraligi, bio,
        profilTamamlandi: true,
      });
      router.push('/');
    } catch {
      setError('Bir hata oluştu, tekrar dene.');
    }
    setYukleniyor(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-16 pt-10">
      <h1 className="text-2xl font-extrabold mb-1">⚽ Profili Tamamla</h1>
      <p className="text-sm text-gray-400 mb-8">
        Diğer oyuncular seni tanısın. Yıldız (*) ile işaretli alanlar zorunludur.
      </p>

      <form onSubmit={kaydet} className="flex flex-col gap-4">

        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1.5">Mevki *</label>
          <select value={mevki} onChange={e => setMevki(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            <option value="Kaleci">Kaleci</option>
            <option value="Defans">Defans</option>
            <option value="Orta Saha">Orta Saha</option>
            <option value="Forvet">Forvet</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1.5">Baskın Ayak</label>
          <select value={baskinAyak} onChange={e => setBaskinAyak(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            <option value="Sağ">Sağ</option>
            <option value="Sol">Sol</option>
            <option value="Her İkisi">Her İkisi</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1.5">Seviye *</label>
          <select value={seviye} onChange={e => setSeviye(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            <option value="Casual">Casual — Eğlence amaçlı</option>
            <option value="Orta">Orta — Düzenli oynuyorum</option>
            <option value="İyi">İyi — Rekabetçi oynuyorum</option>
            <option value="Profesyonel">Profesyonel</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1.5">İlçe *</label>
          <select value={ilce} onChange={e => setIlce(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1.5">Yaş Aralığı</label>
          <select value={yasAraligi} onChange={e => setYasAraligi(e.target.value)} className={selectClass}>
            <option value="">Belirtmek istemiyorum</option>
            <option value="18-25">18 — 25</option>
            <option value="25-35">25 — 35</option>
            <option value="35+">35+</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-600 block mb-1.5">Hakkında (opsiyonel)</label>
          <textarea
            placeholder="Kendinden kısaca bahset... (maks. 160 karakter)"
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 160))}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 resize-y"
          />
          <p className="text-xs text-gray-300 text-right mt-1">{bio.length}/160</p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={yukleniyor}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold text-base rounded-xl transition"
        >
          {yukleniyor ? 'Kaydediliyor...' : 'Profili Tamamla →'}
        </button>

      </form>
    </div>
  );
}
