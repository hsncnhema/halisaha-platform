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

const selectClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 bg-white";
const inputClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400";

export default function ProfilPage() {
  const [kullanici, setKullanici] = useState<any>(null);
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState<any>({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basari, setBasari] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { router.push('/login'); return; }
      const docSnap = await getDoc(doc(db, 'futbolcular', user.uid));
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
      await updateDoc(doc(db, 'futbolcular', kullanici.uid), {
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
    } catch {
      alert('Bir hata oluştu.');
    }
    setKaydediliyor(false);
  };

  const cikisYap = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (yukleniyor) return (
    <div className="max-w-xl mx-auto mt-24 px-4 text-center text-gray-400 text-sm">Yükleniyor...</div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 pb-16 pt-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="text-sm text-green-600 hover:underline">← Ana Sayfa</Link>
        <button
          onClick={cikisYap}
          className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition"
        >
          Çıkış Yap
        </button>
      </div>

      {/* PROFİL KARTI */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-3">
          ⚽
        </div>
        <h2 className="text-xl font-extrabold mb-1">{kullanici?.ad || 'İsimsiz Oyuncu'}</h2>
        <p className="text-sm text-gray-400 mb-3">{kullanici?.email}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {kullanici?.mevki && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">{kullanici.mevki}</span>
          )}
          {kullanici?.seviye && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{kullanici.seviye}</span>
          )}
          {kullanici?.ilce && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">📍 {kullanici.ilce}</span>
          )}
        </div>
        {kullanici?.bio && (
          <p className="text-sm text-gray-400 mt-3 leading-relaxed">{kullanici.bio}</p>
        )}
      </div>

      {/* BAŞARI MESAJI */}
      {basari && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 font-semibold">
          ✅ Profil güncellendi!
        </div>
      )}

      {/* DÜZENLE BUTONLARI */}
      <div className="flex justify-end mb-4">
        {duzenle ? (
          <div className="flex gap-2">
            <button
              onClick={() => setDuzenle(false)}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition"
            >
              İptal
            </button>
            <button
              onClick={kaydet}
              disabled={kaydediliyor}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold transition"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDuzenle(true)}
            className="px-4 py-2 border border-green-600 text-green-600 bg-white rounded-lg text-sm font-semibold hover:bg-green-50 transition"
          >
            ✏️ Düzenle
          </button>
        )}
      </div>

      {/* DÜZENLEME FORMU */}
      {duzenle ? (
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Ad Soyad</label>
            <input
              type="text"
              value={form.ad || ''}
              onChange={e => setForm({ ...form, ad: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Mevki</label>
            <select value={form.mevki || ''} onChange={e => setForm({ ...form, mevki: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              <option value="Kaleci">Kaleci</option>
              <option value="Defans">Defans</option>
              <option value="Orta Saha">Orta Saha</option>
              <option value="Forvet">Forvet</option>
            </select>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Baskın Ayak</label>
            <select value={form.baskinAyak || ''} onChange={e => setForm({ ...form, baskinAyak: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              <option value="Sağ">Sağ</option>
              <option value="Sol">Sol</option>
              <option value="Her İkisi">Her İkisi</option>
            </select>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Seviye</label>
            <select value={form.seviye || ''} onChange={e => setForm({ ...form, seviye: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              <option value="Casual">Casual</option>
              <option value="Orta">Orta</option>
              <option value="İyi">İyi</option>
              <option value="Profesyonel">Profesyonel</option>
            </select>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">İlçe</label>
            <select value={form.ilce || ''} onChange={e => setForm({ ...form, ilce: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Yaş Aralığı</label>
            <select value={form.yasAraligi || ''} onChange={e => setForm({ ...form, yasAraligi: e.target.value })} className={selectClass}>
              <option value="">Belirtmek istemiyorum</option>
              <option value="18-25">18 — 25</option>
              <option value="25-35">25 — 35</option>
              <option value="35+">35+</option>
            </select>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Hakkında</label>
            <textarea
              value={form.bio || ''}
              onChange={e => setForm({ ...form, bio: e.target.value.slice(0, 160) })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 resize-y"
            />
            <p className="text-xs text-gray-300 mt-1 text-right">{(form.bio || '').length}/160</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[
            { label: 'Baskın Ayak', value: kullanici?.baskinAyak },
            { label: 'Yaş Aralığı', value: kullanici?.yasAraligi },
            { label: 'Email', value: kullanici?.email },
          ].filter(item => item.value).map((item, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">{item.label}</label>
              <p className="text-sm font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
