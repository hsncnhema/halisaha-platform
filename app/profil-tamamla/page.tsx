'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ILCELER = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu',
];

const selectClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none';

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
    setError('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError('Önce giriş yapman gerekiyor.');
      setYukleniyor(false);
      return;
    }

    await supabase
      .from('futbolcular')
      .upsert(
        {
          user_id: user.id,
          mevki,
          baskin_ayak: baskinAyak || null,
          seviye,
          ilce,
          il: 'İstanbul',
          yas_araligi: yasAraligi || null,
          bio: bio || null,
          profil_tamamlandi: true,
        },
        { onConflict: 'user_id' }
      );

    await supabase.from('profiles').upsert(
      {
        id: user.id,
        tip: 'futbolcu',
        ad: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Kullanıcı',
      },
      { onConflict: 'id' }
    );

    router.push('/');
    router.refresh();
    setYukleniyor(false);
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-10">
      <h1 className="mb-1 text-2xl font-extrabold">⚽ Profili Tamamla</h1>
      <p className="mb-8 text-sm text-gray-400">
        Diğer oyuncular seni tanısın. Yıldız (*) ile işaretli alanlar zorunludur.
      </p>

      <form onSubmit={kaydet} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">Mevki *</label>
          <select value={mevki} onChange={(e) => setMevki(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            <option value="Kaleci">Kaleci</option>
            <option value="Defans">Defans</option>
            <option value="Orta Saha">Orta Saha</option>
            <option value="Forvet">Forvet</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">Baskın Ayak</label>
          <select value={baskinAyak} onChange={(e) => setBaskinAyak(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            <option value="Sağ">Sağ</option>
            <option value="Sol">Sol</option>
            <option value="Her İkisi">Her İkisi</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">Seviye *</label>
          <select value={seviye} onChange={(e) => setSeviye(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            <option value="Casual">Casual — Eğlence amaçlı</option>
            <option value="Orta">Orta — Düzenli oynuyorum</option>
            <option value="İyi">İyi — Rekabetçi oynuyorum</option>
            <option value="Profesyonel">Profesyonel</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">İlçe *</label>
          <select value={ilce} onChange={(e) => setIlce(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            {ILCELER.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">Yaş Aralığı</label>
          <select value={yasAraligi} onChange={(e) => setYasAraligi(e.target.value)} className={selectClass}>
            <option value="">Belirtmek istemiyorum</option>
            <option value="18-25">18 — 25</option>
            <option value="25-35">25 — 35</option>
            <option value="35+">35+</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">Hakkında (opsiyonel)</label>
          <textarea
            placeholder="Kendinden kısaca bahset... (maks. 160 karakter)"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            rows={3}
            className="w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-gray-300">{bio.length}/160</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={yukleniyor}
          className="w-full rounded-xl bg-green-600 py-3 text-base font-bold text-white transition hover:bg-green-700 disabled:bg-gray-300"
        >
          {yukleniyor ? 'Kaydediliyor...' : 'Profili Tamamla →'}
        </button>
      </form>
    </div>
  );
}
