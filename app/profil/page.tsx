'use client';

import { supabase } from '@/lib/supabase';
import { ILCELER, ILLER } from '@/lib/turkiye';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white focus:border-green-400 focus:outline-none';
const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white focus:border-green-400 focus:outline-none';

type ProfilForm = {
  uid: string;
  email: string;
  ad: string;
  mevki: string;
  baskinAyak: string;
  seviye: string;
  il: string;
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
  il: '',
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
  const ilceler = form.il ? ILCELER(form.il) : [];

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
          .select('mevki, baskin_ayak, seviye, il, ilce, yas_araligi, bio')
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
        il: futbolcuRes.data?.il || '',
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
          il: form.il || null,
          ilce: form.ilce || null,
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
    return <div className="mx-auto mt-24 max-w-xl px-4 text-center text-sm text-white/40">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-green-950 px-4 pb-16 pt-6">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={cikisYap}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10"
        >
          Çıkış Yap
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20 text-3xl">⚽</div>
        <h2 className="mb-1 text-xl font-extrabold text-white">{kullanici.ad || 'İsimsiz Oyuncu'}</h2>
        <p className="mb-3 text-sm text-white/40">{kullanici.email}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {kullanici.mevki && <span className="rounded-full bg-green-900/60 px-2.5 py-0.5 text-xs font-bold text-green-300">{kullanici.mevki}</span>}
          {kullanici.seviye && <span className="rounded-full bg-blue-900/60 px-2.5 py-0.5 text-xs font-bold text-blue-300">{kullanici.seviye}</span>}
          {kullanici.ilce && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/50">📍 {kullanici.ilce}</span>}
        </div>
        {kullanici.bio && <p className="mt-3 text-sm leading-relaxed text-white/40">{kullanici.bio}</p>}
      </div>

      {basari && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400">
          ✅ Profil güncellendi!
        </div>
      )}

      <div className="mb-4 flex justify-end">
        {!duzenle && (
          <button
            onClick={() => setDuzenle(true)}
            className="rounded-lg border border-green-500 bg-white/5 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-white/10"
          >
            ✏️ Düzenle
          </button>
        )}
      </div>

      {duzenle ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/30">Ad Soyad</label>
            <input type="text" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} className={inputClass} />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/30">Mevki</label>
            <select value={form.mevki} onChange={(e) => setForm({ ...form, mevki: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              <option value="Kaleci">Kaleci</option>
              <option value="Defans">Defans</option>
              <option value="Orta Saha">Orta Saha</option>
              <option value="Forvet">Forvet</option>
            </select>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/30">Baskın Ayak</label>
            <select value={form.baskinAyak} onChange={(e) => setForm({ ...form, baskinAyak: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              <option value="Sağ">Sağ</option>
              <option value="Sol">Sol</option>
              <option value="Her İkisi">Her İkisi</option>
            </select>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/30">Seviye</label>
            <select value={form.seviye} onChange={(e) => setForm({ ...form, seviye: e.target.value })} className={selectClass}>
              <option value="">Seç</option>
              <option value="Casual">Casual</option>
              <option value="Orta">Orta</option>
              <option value="İyi">İyi</option>
              <option value="Profesyonel">Profesyonel</option>
            </select>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/30">Il</label>
            <select
              value={form.il}
              onChange={(e) => setForm({ ...form, il: e.target.value, ilce: '' })}
              className={selectClass}
            >
              <option value="">Sec</option>
              {ILLER.map((sehir) => (
                <option key={sehir} value={sehir}>
                  {sehir}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/30">İlçe</label>
            <select
              value={form.ilce}
              onChange={(e) => setForm({ ...form, ilce: e.target.value })}
              disabled={!form.il}
              className={selectClass}
            >
              <option value="">Seç</option>
              {ilceler.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/30">Yaş Aralığı</label>
            <select value={form.yasAraligi} onChange={(e) => setForm({ ...form, yasAraligi: e.target.value })} className={selectClass}>
              <option value="">Belirtmek istemiyorum</option>
              <option value="18-25">18 — 25</option>
              <option value="25-35">25 — 35</option>
              <option value="35+">35+</option>
            </select>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/30">Hakkında</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 160) })}
              rows={3}
              className="w-full resize-y rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white focus:border-green-400 focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-white/20">{form.bio.length}/160</p>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setDuzenle(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10"
            >
              İptal
            </button>
            <button
              onClick={kaydet}
              disabled={kaydediliyor}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:bg-white/10 disabled:text-white/30"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
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
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/30">{item.label}</label>
                <p className="text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
