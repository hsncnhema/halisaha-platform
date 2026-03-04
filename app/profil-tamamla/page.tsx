'use client';

import { supabase } from '@/lib/supabase';
import { ILCELER, ILLER } from '@/lib/turkiye';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const selectClass =
  'bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2';

export default function ProfilTamamlaPage() {
  const [mevki, setMevki] = useState('');
  const [baskinAyak, setBaskinAyak] = useState('');
  const [seviye, setSeviye] = useState('');
  const [il, setIl] = useState('');
  const [ilce, setIlce] = useState('');
  const [yasAraligi, setYasAraligi] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const router = useRouter();

  const ilceler = il ? ILCELER(il) : [];

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mevki || !seviye || !il || !ilce) {
      setError('Mevki, seviye, il ve ilce zorunludur.');
      return;
    }

    setYukleniyor(true);
    setError('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('supabase.auth.getUser error:', userError);
      setError('Önce giriş yapman gerekiyor.');
      setYukleniyor(false);
      return;
    }

    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        tip: 'futbolcu',
        ad: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Kullanıcı',
      })
      .eq('id', user.id)
      .select('id')
      .maybeSingle();

    if (profileError) {
      console.log('profiles update error:', profileError);
      setError('Profil bilgileri kaydedilemedi, tekrar dene.');
      setYukleniyor(false);
      return;
    }

    if (!updatedProfile) {
      console.log('profiles update returned no row for user:', user.id);
      setError('Profil kaydı bulunamadı. Lütfen tekrar giriş yapıp dene.');
      setYukleniyor(false);
      return;
    }

    const { error: futbolcuError } = await supabase
      .from('futbolcular')
      .upsert(
        {
          user_id: user.id,
          mevki,
          baskin_ayak: baskinAyak || null,
          seviye,
          ilce,
          il,
          yas_araligi: yasAraligi || null,
          bio: bio || null,
          profil_tamamlandi: true,
        },
        { onConflict: 'user_id' }
      );

    if (futbolcuError) {
      console.log('futbolcular upsert error:', futbolcuError);
      setError('Profil bilgileri kaydedilemedi, tekrar dene.');
      setYukleniyor(false);
      return;
    }

    router.push('/');
    router.refresh();
    setYukleniyor(false);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-green-950 px-4 pb-16 pt-10">
      <h1 className="mb-1 text-2xl font-extrabold text-white">⚽ Profili Tamamla</h1>
      <p className="mb-8 text-sm text-white/40">
        Diğer oyuncular seni tanısın. Yıldız (*) ile işaretli alanlar zorunludur.
      </p>

      <form onSubmit={kaydet} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/60">Mevki *</label>
          <select value={mevki} onChange={(e) => setMevki(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            <option value="Kaleci">Kaleci</option>
            <option value="Defans">Defans</option>
            <option value="Orta Saha">Orta Saha</option>
            <option value="Forvet">Forvet</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/60">Baskın Ayak</label>
          <select value={baskinAyak} onChange={(e) => setBaskinAyak(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            <option value="Sağ">Sağ</option>
            <option value="Sol">Sol</option>
            <option value="Her İkisi">Her İkisi</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/60">Seviye *</label>
          <select value={seviye} onChange={(e) => setSeviye(e.target.value)} className={selectClass}>
            <option value="">Seç</option>
            <option value="Casual">Casual — Eğlence amaçlı</option>
            <option value="Orta">Orta — Düzenli oynuyorum</option>
            <option value="İyi">İyi — Rekabetçi oynuyorum</option>
            <option value="Profesyonel">Profesyonel</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/60">Il *</label>
          <select value={il} onChange={(e) => { setIl(e.target.value); setIlce(''); }} className={selectClass}>
            <option value="">Sec</option>
            {ILLER.map((sehir) => (
              <option key={sehir} value={sehir}>
                {sehir}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/60">Ilce *</label>
          <select value={ilce} onChange={(e) => setIlce(e.target.value)} disabled={!il} className={selectClass}>
            <option value="">{il ? 'Sec' : 'Once il sec'}</option>
            {ilceler.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/60">Yaş Aralığı</label>
          <select value={yasAraligi} onChange={(e) => setYasAraligi(e.target.value)} className={selectClass}>
            <option value="">Belirtmek istemiyorum</option>
            <option value="18-25">18 — 25</option>
            <option value="25-35">25 — 35</option>
            <option value="35+">35+</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-white/60">Hakkında (opsiyonel)</label>
          <textarea
            placeholder="Kendinden kısaca bahset... (maks. 160 karakter)"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            rows={3}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-green-400 focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-white/20">{bio.length}/160</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={yukleniyor}
          className="w-full rounded-xl bg-green-600 py-3 text-base font-bold text-white transition hover:bg-green-700 disabled:bg-white/10 disabled:text-white/30"
        >
          {yukleniyor ? 'Kaydediliyor...' : 'Profili Tamamla →'}
        </button>
      </form>
    </div>
  );
}
