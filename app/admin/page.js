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

const SAAT_SECENEKLERI = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00',
];

const bosForm = {
  sahaAdi: '',
  telefon: '',
  email: '',
  ilce: '',
  format: '7v7',
  fiyat: '',
  acilisSaati: '09:00',
  kapanisSaati: '23:00',
  slotSuresi: 60,
  kurallar: '',
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

  const verileriGetir = async () => {
    const [bekleyenRes, aktifRes, futbolcularRes, futbolcuProfileRes, ilanRes] = await Promise.all([
      supabase.from('sahalar').select('*').eq('durum', 'beklemede').order('created_at', { ascending: false }),
      supabase.from('sahalar').select('*').eq('durum', 'aktif').order('created_at', { ascending: false }),
      supabase.from('futbolcular').select('*'),
      supabase.from('profiles').select('id, ad').eq('tip', 'futbolcu'),
      supabase.from('ilanlar').select('*').order('olusturulma', { ascending: false }),
    ]);

    setBekleyenSahalar(bekleyenRes.data || []);
    setAktifSahalar(aktifRes.data || []);
    setIlanlar(ilanRes.data || []);

    const profileMap = new Map((futbolcuProfileRes.data || []).map((p) => [p.id, p]));
    const futbolcuData = (futbolcularRes.data || []).map((f) => ({
      ...f,
      ad: profileMap.get(f.user_id)?.ad || 'İsimsiz',
    }));
    setFutbolcular(futbolcuData);
  };

  useEffect(() => {
    const kontrolEt = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tip, ad')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.tip !== 'admin') {
        router.push('/');
        return;
      }

      setKullanici({ id: user.id, email: user.email, ad: profile.ad });
      await verileriGetir();
      setYukleniyor(false);
    };

    kontrolEt();
  }, [router]);

  const sahaOnayla = async (id) => {
    await supabase.from('sahalar').update({ durum: 'aktif' }).eq('id', id);
    await verileriGetir();
  };

  const sahaReddet = async (id) => {
    await supabase.from('sahalar').update({ durum: 'pasif' }).eq('id', id);
    await verileriGetir();
  };

  const sahaDeaktif = async (id) => {
    await supabase.from('sahalar').update({ durum: 'pasif' }).eq('id', id);
    await verileriGetir();
  };

  const sahaEkle = async (e) => {
    e.preventDefault();
    if (!sahaForm.sahaAdi || !sahaForm.telefon || !sahaForm.ilce) {
      alert('Saha adı, telefon ve ilçe zorunludur.');
      return;
    }

    setSahaEkleniyor(true);
    const { error } = await supabase.from('sahalar').insert({
      user_id: null,
      saha_adi: sahaForm.sahaAdi,
      telefon: sahaForm.telefon,
      il: 'İstanbul',
      ilce: sahaForm.ilce,
      format: sahaForm.format,
      fiyat: Number(sahaForm.fiyat) || null,
      acilis_saati: sahaForm.acilisSaati,
      kapanis_saati: sahaForm.kapanisSaati,
      slot_suresi: Number(sahaForm.slotSuresi),
      durum: 'aktif',
      kurallar: sahaForm.kurallar || null,
    });

    if (error) {
      console.error(error);
      alert('Hata oluştu.');
      setSahaEkleniyor(false);
      return;
    }

    setSahaForm(bosForm);
    setSahaFormAcik(false);
    setBasari('Saha eklendi!');
    setAktifSekme('sahalar');
    setTimeout(() => setBasari(''), 3000);
    await verileriGetir();
    setSahaEkleniyor(false);
  };

  if (yukleniyor) {
    return (
      <div className="mx-auto mt-24 max-w-4xl px-4 text-center">
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      </div>
    );
  }

  const sekmeClass = (id) =>
    `rounded-lg px-4 py-2.5 text-sm font-bold transition ${
      aktifSekme === id ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
    }`;

  const inputClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-400';
  const labelClass = 'mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500';

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-0.5 text-xl font-extrabold">🛡️ Admin Paneli</h1>
          <p className="text-xs text-gray-500">{kullanici?.email}</p>
        </div>
        <Link href="/" className="text-sm font-semibold text-green-600 hover:underline">
          ← Ana Sayfa
        </Link>
      </div>

      {basari && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          ✅ {basari}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Bekleyen', value: bekleyenSahalar.length, valueClass: 'text-amber-600', cardClass: 'border-amber-200 bg-amber-50' },
          { label: 'Aktif Saha', value: aktifSahalar.length, valueClass: 'text-green-600', cardClass: 'border-green-200 bg-green-50' },
          { label: 'Futbolcu', value: futbolcular.length, valueClass: 'text-blue-600', cardClass: 'border-blue-200 bg-blue-50' },
          { label: 'Aktif İlan', value: ilanlar.length, valueClass: 'text-violet-600', cardClass: 'border-violet-200 bg-violet-50' },
        ].map((item, i) => (
          <div key={i} className={`rounded-xl border p-4 text-center ${item.cardClass}`}>
            <div className={`text-2xl font-extrabold ${item.valueClass}`}>{item.value}</div>
            <div className="mt-1 text-xs text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-green-50 p-1">
        {[
          { id: 'basvurular', label: `🕐 Başvurular (${bekleyenSahalar.length})` },
          { id: 'sahalar', label: '🏟️ Aktif Sahalar' },
          { id: 'kullanicilar', label: '⚽ Kullanıcılar' },
          { id: 'ilanlar', label: '📋 İlanlar' },
        ].map((s) => (
          <button key={s.id} onClick={() => setAktifSekme(s.id)} className={sekmeClass(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {aktifSekme === 'basvurular' && (
        <div>
          {bekleyenSahalar.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center text-gray-500">
              <p className="mb-2 text-3xl">✅</p>
              <p className="text-sm font-semibold">Bekleyen başvuru yok</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bekleyenSahalar.map((saha) => (
                <div key={saha.id} className="rounded-xl border border-amber-200 bg-white p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="mb-1 text-base font-extrabold">🏟️ {saha.saha_adi}</h3>
                      <p className="text-sm text-gray-500">📞 {saha.telefon}</p>
                      {saha.ilce && <p className="text-sm text-gray-500">📍 {saha.ilce}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {saha.created_at ? new Date(saha.created_at).toLocaleDateString('tr-TR') : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => sahaOnayla(saha.id)} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700">
                      ✅ Onayla
                    </button>
                    <button onClick={() => sahaReddet(saha.id)} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100">
                      ❌ Reddet
                    </button>
                    <Link href={`/saha/${saha.id}`} target="_blank" className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100">
                      Profili Gör →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {aktifSekme === 'sahalar' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setSahaFormAcik(!sahaFormAcik)} className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-700">
              {sahaFormAcik ? 'İptal' : '+ Saha Ekle'}
            </button>
          </div>

          {sahaFormAcik && (
            <div className="mb-5 rounded-2xl border border-green-300 bg-white p-5">
              <h3 className="mb-4 text-base font-extrabold">Yeni Saha Ekle</h3>
              <form onSubmit={sahaEkle} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Saha Adı *</label>
                    <input type="text" value={sahaForm.sahaAdi} onChange={(e) => setSahaForm({ ...sahaForm, sahaAdi: e.target.value })} className={inputClass} placeholder="örn: Kadıköy Arena" />
                  </div>
                  <div>
                    <label className={labelClass}>Telefon / WhatsApp *</label>
                    <input type="tel" value={sahaForm.telefon} onChange={(e) => setSahaForm({ ...sahaForm, telefon: e.target.value })} className={inputClass} placeholder="05xx xxx xx xx" />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={sahaForm.email} onChange={(e) => setSahaForm({ ...sahaForm, email: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>İlçe *</label>
                    <select value={sahaForm.ilce} onChange={(e) => setSahaForm({ ...sahaForm, ilce: e.target.value })} className={inputClass}>
                      <option value="">Seç</option>
                      {ILCELER.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Format</label>
                    <select value={sahaForm.format} onChange={(e) => setSahaForm({ ...sahaForm, format: e.target.value })} className={inputClass}>
                      <option value="5v5">5v5</option>
                      <option value="6v6">6v6</option>
                      <option value="7v7">7v7</option>
                      <option value="8v8">8v8</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Saatlik Fiyat (₺)</label>
                    <input type="number" value={sahaForm.fiyat} onChange={(e) => setSahaForm({ ...sahaForm, fiyat: e.target.value })} className={inputClass} placeholder="örn: 3500" />
                  </div>
                  <div>
                    <label className={labelClass}>Açılış Saati</label>
                    <select value={sahaForm.acilisSaati} onChange={(e) => setSahaForm({ ...sahaForm, acilisSaati: e.target.value })} className={inputClass}>
                      {SAAT_SECENEKLERI.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Kapanış Saati</label>
                    <select value={sahaForm.kapanisSaati} onChange={(e) => setSahaForm({ ...sahaForm, kapanisSaati: e.target.value })} className={inputClass}>
                      {SAAT_SECENEKLERI.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Slot Süresi</label>
                    <select value={sahaForm.slotSuresi} onChange={(e) => setSahaForm({ ...sahaForm, slotSuresi: e.target.value })} className={inputClass}>
                      <option value={60}>60 dakika</option>
                      <option value={90}>90 dakika</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Kurallar / Notlar</label>
                  <textarea value={sahaForm.kurallar} onChange={(e) => setSahaForm({ ...sahaForm, kurallar: e.target.value })} rows={3} className={`${inputClass} resize-y`} placeholder="Sahaya özel bilgilendirme..." />
                </div>
                <button type="submit" disabled={sahaEkleniyor} className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                  {sahaEkleniyor ? 'Ekleniyor...' : 'Sahayı Ekle ve Yayınla'}
                </button>
              </form>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {aktifSahalar.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">Henüz aktif saha yok.</p>
            ) : (
              aktifSahalar.map((saha) => (
                <div key={saha.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold">🏟️ {saha.saha_adi}</p>
                    <p className="text-xs text-gray-500">
                      {saha.ilce} — {saha.format} — {saha.fiyat ? `${saha.fiyat} ₺` : 'Fiyat yok'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/saha/${saha.id}`} target="_blank" className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100">
                      Gör →
                    </Link>
                    <button onClick={() => sahaDeaktif(saha.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100">
                      Deaktif Et
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {aktifSekme === 'kullanicilar' && (
        <div className="flex flex-col gap-3">
          {futbolcular.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">Henüz kayıtlı futbolcu yok.</p>
          ) : (
            futbolcular.map((f) => (
              <div key={f.user_id} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold">⚽ {f.ad || 'İsimsiz'}</p>
                  <p className="text-xs text-gray-500">{f.ilce || '-'} — {f.mevki || '-'}</p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${f.profil_tamamlandi ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                  {f.profil_tamamlandi ? 'Profil Tam' : 'Eksik Profil'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {aktifSekme === 'ilanlar' && (
        <div className="flex flex-col gap-3">
          {ilanlar.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">Henüz ilan yok.</p>
          ) : (
            ilanlar.map((ilan) => (
              <div key={ilan.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                    {ilan.kategori}
                  </span>
                  <span className="text-xs text-gray-500">📍 {ilan.ilce}</span>
                </div>
                <p className="mb-1 text-sm font-bold">{ilan.baslik}</p>
                <p className="text-xs text-gray-500">{ilan.aciklama}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
