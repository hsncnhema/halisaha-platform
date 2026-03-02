'use client';

import { supabase } from '@/lib/supabase';
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
  'Ümraniye', 'Üsküdar', 'Zeytinburnu',
];

const selectClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none';
const inputClass =
  'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none';

type ProfilForm = {
  uid: string;
  email: string;
  ad: string;
  mevki: string;
  baskinAyak: string;
  seviye: string;
  ilce: string;
  yasAraligi: string;
  bio: string;
};

const bosForm: ProfilForm = {
  uid: '',
  email: '',
  ad: '',
  mevki: '',
  baskinAyak: '',
  seviye: '',
  ilce: '',
  yasAraligi: '',
  bio: '',
};

export default function ProfilPage() {
  const [kullanici, setKullanici] = useState<ProfilForm>(bosForm);
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState<ProfilForm>(bosForm);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basari, setBasari] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const yukle = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const [profileRes, futbolcuRes] = await Promise.all([
        supabase.from('profiles').select('ad').eq('id', user.id).maybeSingle(),
        supabase
          .from('futbolcular')
          .select('mevki, baskin_ayak, seviye, ilce, yas_araligi, bio')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const data: ProfilForm = {
        uid: user.id,
        email: user.email || '',
        ad: profileRes.data?.ad || user.user_metadata?.full_name || user.user_metadata?.name || '',
        mevki: futbolcuRes.data?.mevki || '',
        baskinAyak: futbolcuRes.data?.baskin_ayak || '',
        seviye: futbolcuRes.data?.seviye || '',
        ilce: futbolcuRes.data?.ilce || '',
        yasAraligi: futbolcuRes.data?.yas_araligi || '',
        bio: futbolcuRes.data?.bio || '',
      };

      setKullanici(data);
      setForm(data);
      setYukleniyor(false);
    };

    yukle();
  }, [router]);

  const kaydet = async () => {
    setKaydediliyor(true);

    const [profileUpdate, futbolcuUpdate] = await Promise.all([
      supabase.from('profiles').update({ ad: form.ad }).eq('id', form.uid),
      supabase.from('futbolcular').upsert(
        {
          user_id: form.uid,
          mevki: form.mevki || null,
          baskin_ayak: form.baskinAyak || null,
          seviye: form.seviye || null,
          ilce: form.ilce || null,
          il: 'İstanbul',
          yas_araligi: form.yasAraligi || null,
          bio: form.bio || null,
        },
        { onConflict: 'user_id' }
      ),
    ]);

    if (profileUpdate.error || futbolcuUpdate.error) {
      alert('Bir hata oluştu.');
      setKaydediliyor(false);
      return;
    }

    setKullanici({ ...form });
    setDuzenle(false);
    setBasari(true);
    setTimeout(() => setBasari(false), 3000);
    setKaydediliyor(false);
  };

  const cikisYap = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (yukleniyor) {
    return <div className="mx-auto mt-24 max-w-xl px-4 text-center text-sm text-gray-400">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm text-green-600 hover:underline">
          ← Ana Sayfa
        </Link>
        <button
          onClick={cikisYap}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 transition hover:bg-gray-50"
        >
          Çıkış Yap
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">⚽</div>
        <h2 className="mb-1 text-xl font-extrabold">{kullanici.ad || 'İsimsiz Oyuncu'}</h2>
        <p className="mb-3 text-sm text-gray-400">{kullanici.email}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {kullanici.mevki && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">{kullanici.mevki}</span>}
          {kullanici.seviye && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">{kullanici.seviye}</span>}
          {kullanici.ilce && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">📍 {kullanici.ilce}</span>}
        </div>
        {kullanici.bio && <p className="mt-3 text-sm leading-relaxed text-gray-400">{kullanici.bio}</p>}
      </div>

      {basari && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          ✅ Profil güncellendi!
        </div>
      )}

      <div className="mb-4 flex justify-end">
        {duzenle ? (
          <div className="flex gap-2">
            <button
              onClick={() => setDuzenle(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 transition hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              onClick={kaydet}
              disabled={kaydediliyor}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:bg-gray-300"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDuzenle(true)}
            className="rounded-lg border border-green-600 bg-white px-4 py-2 text-sm font-semibold text-green-600 transition hover:bg-green-50"
          >
            ✏️ Düzenle
          </button>
        )}
      </div>

      {duzenle ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Ad Soyad</label>
            <input type="text" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} className={inputClass} />
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Mevki</label>
            <select value={form.mevki} onChange={(e) => setForm({ ...form, mevki: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              <option value="Kaleci">Kaleci</option>
              <option value="Defans">Defans</option>
              <option value="Orta Saha">Orta Saha</option>
              <option value="Forvet">Forvet</option>
            </select>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Baskın Ayak</label>
            <select value={form.baskinAyak} onChange={(e) => setForm({ ...form, baskinAyak: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              <option value="Sağ">Sağ</option>
              <option value="Sol">Sol</option>
              <option value="Her İkisi">Her İkisi</option>
            </select>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Seviye</label>
            <select value={form.seviye} onChange={(e) => setForm({ ...form, seviye: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              <option value="Casual">Casual</option>
              <option value="Orta">Orta</option>
              <option value="İyi">İyi</option>
              <option value="Profesyonel">Profesyonel</option>
            </select>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">İlçe</label>
            <select value={form.ilce} onChange={(e) => setForm({ ...form, ilce: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              {ILCELER.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Yaş Aralığı</label>
            <select value={form.yasAraligi} onChange={(e) => setForm({ ...form, yasAraligi: e.target.value })} className={selectClass}>
              <option value="">Belirtmek istemiyorum</option>
              <option value="18-25">18 — 25</option>
              <option value="25-35">25 — 35</option>
              <option value="35+">35+</option>
            </select>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Hakkında</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 160) })}
              rows={3}
              className="w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-gray-300">{form.bio.length}/160</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[
            { label: 'Baskın Ayak', value: kullanici.baskinAyak },
            { label: 'Yaş Aralığı', value: kullanici.yasAraligi },
            { label: 'Email', value: kullanici.email },
          ]
            .filter((item) => item.value)
            .map((item, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">{item.label}</label>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
