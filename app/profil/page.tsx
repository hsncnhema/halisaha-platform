'use client';

import { supabase } from '@/lib/supabase';
import { ILCELER, ILLER } from '@/lib/turkiye';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [ilanlar, setIlanlar] = useState<any[]>([]);
  const [arkadasSayisi, setArkadasSayisi] = useState(0);
  const [arkadaslar, setArkadaslar] = useState<any[]>([]);
  const [arkadaslarYukleniyor, setArkadaslarYukleniyor] = useState(false);
  const [aktifSekme, setAktifSekme] = useState<'profil_duzenle' | 'ilanlarim' | 'arkadaslar'>('ilanlarim');
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

      // İlanları çek
      const { data: ilanData } = await supabase
        .from('ilanlar')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setIlanlar(ilanData || []);

      // Arkadaşlar (Kabul edilmiş) sayısını bul
      const { count } = await supabase
        .from('arkadasliklar')
        .select('id', { count: 'exact' })
        .or(
          `and(gonderen_id.eq.${user.id},durum.eq.kabul),` +
          `and(alici_id.eq.${user.id},durum.eq.kabul)`
        );

      setArkadasSayisi(count || 0);

      setYukleniyor(false);
    };

    yukle();
  }, [router]);

  useEffect(() => {
    if (aktifSekme === 'arkadaslar' && arkadaslar.length === 0 && kullanici.uid) {
      const arkadaslariGetir = async () => {
        setArkadaslarYukleniyor(true);
        const { data } = await supabase
          .from('arkadasliklar')
          .select(`
            id,
            gonderen:profiles!gonderen_id(id, ad),
            alici:profiles!alici_id(id, ad)
          `)
          .or(`gonderen_id.eq.${kullanici.uid},alici_id.eq.${kullanici.uid}`)
          .eq('durum', 'kabul');

        if (data) {
          setArkadaslar(data);
        }
        setArkadaslarYukleniyor(false);
      };
      arkadaslariGetir();
    }
  }, [aktifSekme, kullanici.uid, arkadaslar.length]);

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

      <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 w-full">
          <div className="flex shrink-0 h-24 w-24 items-center justify-center rounded-full bg-green-600 text-3xl font-black text-white shadow-lg shadow-black/30">
            {kullanici.ad ? kullanici.ad.charAt(0).toLocaleUpperCase('tr-TR') : '?'}
          </div>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 mb-2 w-full">
              <h2 className="text-2xl font-extrabold text-white truncate w-full">{kullanici.ad || 'İsimsiz Oyuncu'}</h2>
              <button
                onClick={() => {
                  setAktifSekme('profil_duzenle');
                  setDuzenle(true);
                }}
                className="shrink-0 rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-500/20"
              >
                ✏️ Düzenle
              </button>
            </div>

            <p className="mb-3 text-sm text-white/40">{kullanici.email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              {kullanici.mevki && <span className="rounded-full bg-green-900/60 px-3 py-1 text-xs font-bold text-green-300">{kullanici.mevki}</span>}
              {kullanici.seviye && <span className="rounded-full bg-blue-900/60 px-3 py-1 text-xs font-bold text-blue-300">{kullanici.seviye}</span>}
              {kullanici.ilce && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/50">📍 {kullanici.ilce}, {kullanici.il}</span>}
            </div>
          </div>
        </div>
        <div className="relative z-10 w-full mt-4">
          {kullanici.bio && <p className="text-sm leading-relaxed text-white/60 text-center sm:text-left">{kullanici.bio}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-2xl font-black text-white">{ilanlar.length}</p>
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mt-1">Açılan İlanlar</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-2xl font-black text-white">{arkadasSayisi}</p>
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mt-1">Arkadaşlar</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center opacity-60">
          <p className="text-2xl font-black text-white">0</p>
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mt-1">Maçlar<br /><span className="text-[10px] text-green-400">(Yakında)</span></p>
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b border-white/10 overflow-x-auto pb-1">
        <button
          onClick={() => { setAktifSekme('ilanlarim'); setDuzenle(false); }}
          className={`pb-3 px-4 text-sm font-bold whitespace-nowrap ${aktifSekme === 'ilanlarim' ? 'border-b-2 border-green-500 text-green-400' : 'text-white/50 hover:text-white/80'}`}
        >
          İlanlarım
        </button>
        <button
          onClick={() => { setAktifSekme('arkadaslar'); setDuzenle(false); }}
          className={`pb-3 px-4 text-sm font-bold whitespace-nowrap ${aktifSekme === 'arkadaslar' ? 'border-b-2 border-green-500 text-green-400' : 'text-white/50 hover:text-white/80'}`}
        >
          Arkadaşlar
        </button>
        <button
          onClick={() => { setAktifSekme('profil_duzenle'); setDuzenle(false); }}
          className={`pb-3 px-4 text-sm font-bold whitespace-nowrap ${aktifSekme === 'profil_duzenle' ? 'border-b-2 border-green-500 text-green-400' : 'text-white/50 hover:text-white/80'}`}
        >
          Hakkında
        </button>
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
      ) : aktifSekme === 'profil_duzenle' ? (
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
      ) : aktifSekme === 'ilanlarim' ? (
        <div className="flex flex-col gap-3">
          {ilanlar.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
              Henüz ilan açmadınız.
              <div className="mt-4">
                <Link href="/ilanlar" className="text-green-400 font-bold hover:underline">İlan Aç →</Link>
              </div>
            </div>
          ) : (
            ilanlar.map((ilan: any) => (
              <Link
                key={ilan.id}
                href={`/ilanlar/${ilan.id}`}
                className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-green-500/40 hover:bg-white/10"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/60">
                    {ilan.kategori}
                  </span>
                  <span className="text-xs text-white/30">
                    {new Date(ilan.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{ilan.baslik}</h3>
                <p className="text-xs text-white/50 line-clamp-2">{ilan.aciklama}</p>
              </Link>
            ))
          )}
        </div>
      ) : aktifSekme === 'arkadaslar' ? (
        <div className="flex flex-col gap-3">
          {arkadaslarYukleniyor ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
              Yükleniyor...
            </div>
          ) : arkadaslar.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
              Henüz arkadaşın yok.
            </div>
          ) : (
            arkadaslar.map((item: any) => {
              const arkadas = item.gonderen?.id === kullanici.uid ? item.alici : item.gonderen;
              if (!arkadas) return null;

              return (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white shadow-lg">
                      {arkadas.ad ? arkadas.ad.charAt(0).toLocaleUpperCase('tr-TR') : '?'}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-white text-sm truncate">{arkadas.ad}</p>
                    </div>
                  </div>
                  <Link
                    href={`/profil/${arkadas.id}`}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10 hover:text-green-400"
                  >
                    Profile Git
                  </Link>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
