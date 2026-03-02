'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
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

const SAAT_SECENEKLERI = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00',
];

const saatiDakikayaCevir = (saat: string) => {
  const [h, m] = saat.split(':').map(Number);
  return h * 60 + m;
};

const dakikayaSaateCevir = (dakika: number) => {
  const n = dakika % (24 * 60);
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};

const slotlarUret = (acilis: string, kapanis: string, slotSuresi: number) => {
  const slotlar: string[] = [];
  let baslangic = saatiDakikayaCevir(acilis);
  let bitis = saatiDakikayaCevir(kapanis);
  if (bitis <= baslangic) bitis += 24 * 60;
  while (baslangic + slotSuresi <= bitis) {
    slotlar.push(`${dakikayaSaateCevir(baslangic)}-${dakikayaSaateCevir(baslangic + slotSuresi)}`);
    baslangic += slotSuresi;
  }
  return slotlar;
};

const bugunTarih = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });

const sonrakiGunler = () => {
  const gunler: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    gunler.push(d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
  }
  return gunler;
};

const tarihFormat = (tarih: string) => {
  const d = new Date(`${tarih}T00:00:00`);
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const selectClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none';
const inputClass =
  'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none';

type SahaState = {
  id: string;
  uid: string;
  sahaAdi: string;
  telefon: string;
  ilce: string;
  format: string;
  fiyat: number | null;
  kurallar: string;
  acilisSaati: string;
  kapanisSaati: string;
  slotSuresi: number;
  durum: string;
  kurulumTamamlandi: boolean;
  musaitlik: Record<string, 'bos' | 'dolu'>;
};

export default function HalisahaPanelPage() {
  const [saha, setSaha] = useState<SahaState | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aktifSekme, setAktifSekme] = useState('takvim');
  const [seciliGun, setSeciliGun] = useState(bugunTarih());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basari, setBasari] = useState('');
  const [profilForm, setProfilForm] = useState<Partial<SahaState>>({});
  const [kurulumForm, setKurulumForm] = useState({
    acilisSaati: '09:00',
    kapanisSaati: '23:00',
    slotSuresi: '60',
  });
  const [kurulumKaydediliyor, setKurulumKaydediliyor] = useState(false);
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

      const { data: sahaRow } = await supabase
        .from('sahalar')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!sahaRow) {
        router.push('/login');
        return;
      }

      const { data: musaitlikRows } = await supabase
        .from('musaitlik')
        .select('tarih, slot, durum')
        .eq('saha_id', sahaRow.id);

      const musaitlikMap: Record<string, 'bos' | 'dolu'> = {};
      for (const row of musaitlikRows ?? []) {
        musaitlikMap[`${row.tarih}_${row.slot}`] = row.durum;
      }

      const data: SahaState = {
        id: sahaRow.id,
        uid: user.id,
        sahaAdi: sahaRow.saha_adi,
        telefon: sahaRow.telefon,
        ilce: sahaRow.ilce || '',
        format: sahaRow.format || '',
        fiyat: sahaRow.fiyat,
        kurallar: sahaRow.kurallar || '',
        acilisSaati: sahaRow.acilis_saati || '09:00',
        kapanisSaati: sahaRow.kapanis_saati || '23:00',
        slotSuresi: sahaRow.slot_suresi || 60,
        durum: sahaRow.durum,
        kurulumTamamlandi: Boolean(sahaRow.acilis_saati && sahaRow.kapanis_saati && sahaRow.slot_suresi),
        musaitlik: musaitlikMap,
      };

      setSaha(data);
      setProfilForm(data);
      setKurulumForm({
        acilisSaati: data.acilisSaati,
        kapanisSaati: data.kapanisSaati,
        slotSuresi: String(data.slotSuresi),
      });
      setYukleniyor(false);
    };

    yukle();
  }, [router]);

  const kurulumKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saha) return;
    setKurulumKaydediliyor(true);

    const { error } = await supabase
      .from('sahalar')
      .update({
        acilis_saati: kurulumForm.acilisSaati,
        kapanis_saati: kurulumForm.kapanisSaati,
        slot_suresi: Number(kurulumForm.slotSuresi),
      })
      .eq('id', saha.id);

    if (!error) {
      setSaha({
        ...saha,
        acilisSaati: kurulumForm.acilisSaati,
        kapanisSaati: kurulumForm.kapanisSaati,
        slotSuresi: Number(kurulumForm.slotSuresi),
        kurulumTamamlandi: true,
      });
    }
    setKurulumKaydediliyor(false);
  };

  const slotToggle = async (slot: string) => {
    if (!saha) return;
    const anahtar = `${seciliGun}_${slot}`;
    const yeniDurum: 'bos' | 'dolu' = (saha.musaitlik[anahtar] || 'bos') === 'bos' ? 'dolu' : 'bos';
    const yeniMusaitlik = { ...saha.musaitlik, [anahtar]: yeniDurum };
    setSaha({ ...saha, musaitlik: yeniMusaitlik });

    await supabase.from('musaitlik').upsert(
      {
        saha_id: saha.id,
        tarih: seciliGun,
        slot,
        durum: yeniDurum,
      },
      { onConflict: 'saha_id,tarih,slot' }
    );
  };

  const profilKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saha) return;
    setKaydediliyor(true);

    const { error } = await supabase
      .from('sahalar')
      .update({
        saha_adi: profilForm.sahaAdi,
        telefon: profilForm.telefon,
        ilce: profilForm.ilce,
        format: profilForm.format,
        fiyat: Number(profilForm.fiyat),
        kurallar: profilForm.kurallar || null,
      })
      .eq('id', saha.id);

    if (!error) {
      setSaha({ ...saha, ...profilForm });
      setBasari('Profil güncellendi!');
      setTimeout(() => setBasari(''), 3000);
    }
    setKaydediliyor(false);
  };

  const cikisYap = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (yukleniyor || !saha) {
    return <div className="mx-auto mt-24 max-w-2xl px-4 text-center text-sm text-gray-400">Yükleniyor...</div>;
  }

  if (!saha.kurulumTamamlandi) {
    const onizlemeSlotlar = slotlarUret(
      kurulumForm.acilisSaati,
      kurulumForm.kapanisSaati,
      Number(kurulumForm.slotSuresi)
    );

    return (
      <div className="mx-auto max-w-md px-4 pb-16 pt-10">
        <h1 className="mb-2 text-2xl font-extrabold">🏟️ Saha Kurulumu</h1>
        <p className="mb-8 text-sm leading-relaxed text-gray-400">
          Müsaitlik takvimini oluşturmak için çalışma saatlerini ve slot süresini belirle. Daha sonra değiştirebilirsin.
        </p>

        <form onSubmit={kurulumKaydet} className="flex flex-col gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Açılış Saati</label>
            <select
              value={kurulumForm.acilisSaati}
              onChange={(e) => setKurulumForm({ ...kurulumForm, acilisSaati: e.target.value })}
              className={selectClass}
            >
              {SAAT_SECENEKLERI.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label className="mb-2 mt-4 block text-xs font-bold uppercase tracking-wide text-gray-400">Kapanış Saati</label>
            <select
              value={kurulumForm.kapanisSaati}
              onChange={(e) => setKurulumForm({ ...kurulumForm, kapanisSaati: e.target.value })}
              className={selectClass}
            >
              {SAAT_SECENEKLERI.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label className="mb-2 mt-4 block text-xs font-bold uppercase tracking-wide text-gray-400">Slot Süresi</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '60 dakika', value: '60', ornek: '19:00-20:00' },
                { label: '90 dakika', value: '90', ornek: '19:00-20:30' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKurulumForm({ ...kurulumForm, slotSuresi: opt.value })}
                  className={`rounded-xl border-2 p-3 text-center transition ${
                    kurulumForm.slotSuresi === opt.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}
                >
                  <div className={`text-sm font-bold ${kurulumForm.slotSuresi === opt.value ? 'text-green-600' : 'text-gray-700'}`}>
                    {opt.label}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">örn: {opt.ornek}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="mb-2 text-xs font-bold text-green-600">ÖNİZLEME — İlk 4 Slot</p>
            <div className="flex flex-wrap gap-2">
              {onizlemeSlotlar.slice(0, 4).map((slot) => (
                <span key={slot} className="rounded-lg border border-green-200 bg-white px-2.5 py-1 text-xs font-semibold text-green-700">
                  {slot}
                </span>
              ))}
              <span className="self-center text-xs text-gray-400">... toplam {onizlemeSlotlar.length} slot</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={kurulumKaydediliyor}
            className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:bg-gray-300"
          >
            {kurulumKaydediliyor ? 'Kaydediliyor...' : 'Kurulumu Tamamla →'}
          </button>
        </form>
      </div>
    );
  }

  const slotlar = slotlarUret(saha.acilisSaati, saha.kapanisSaati, saha.slotSuresi);
  const gunler = sonrakiGunler();
  const bugunDolu = slotlar.filter((s) => saha.musaitlik[`${seciliGun}_${s}`] === 'dolu').length;
  const bugunBos = slotlar.length - bugunDolu;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-0.5 text-xl font-extrabold">🏟️ {saha.sahaAdi}</h1>
          <p
            className={`text-xs font-bold ${
              saha.durum === 'aktif'
                ? 'text-green-600'
                : saha.durum === 'reddedildi'
                  ? 'text-red-600'
                  : 'text-amber-500'
            }`}
          >
            {saha.durum === 'aktif'
              ? '✅ Yayinda'
              : saha.durum === 'reddedildi'
                ? '❌ Basvuru Reddedildi'
                : '🕐 Onay Bekliyor'}
          </p>
        </div>
        <button
          onClick={cikisYap}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 transition hover:bg-gray-50"
        >
          Çıkış
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
          <div className="text-2xl font-extrabold text-green-600">{bugunBos}</div>
          <div className="mt-1 text-xs text-gray-400">Bugün Boş</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-2xl font-extrabold text-red-500">{bugunDolu}</div>
          <div className="mt-1 text-xs text-gray-400">Bugün Dolu</div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
          <div className="text-2xl font-extrabold text-blue-600">{saha.format || '—'}</div>
          <div className="mt-1 text-xs text-gray-400">Format</div>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-green-50 p-1">
        {[
          { id: 'takvim', label: '📅 Takvim' },
          { id: 'profil', label: '⚙️ Profil' },
        ].map((sekme) => (
          <button
            key={sekme.id}
            onClick={() => setAktifSekme(sekme.id)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
              aktifSekme === sekme.id ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {sekme.label}
          </button>
        ))}
      </div>

      {aktifSekme === 'takvim' && (
        <div>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {gunler.map((gun) => (
              <button
                key={gun}
                onClick={() => setSeciliGun(gun)}
                className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  seciliGun === gun
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                }`}
              >
                {tarihFormat(gun)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {slotlar.map((slot) => {
              const bos = (saha.musaitlik[`${seciliGun}_${slot}`] || 'bos') === 'bos';
              return (
                <button
                  key={slot}
                  onClick={() => slotToggle(slot)}
                  className={`w-full rounded-xl border-2 px-4 py-3.5 transition ${
                    bos ? 'border-green-200 bg-green-50 hover:border-green-400' : 'border-red-200 bg-red-50 hover:border-red-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{slot}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${bos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {bos ? '✅ Boş' : '❌ Dolu'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-gray-300">Slota tıklayarak boş / dolu olarak işaretle</p>
        </div>
      )}

      {aktifSekme === 'profil' && (
        <div>
          {basari && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              ✅ {basari}
            </div>
          )}
          <form onSubmit={profilKaydet} className="flex flex-col gap-3">
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">Saha Adı</label>
                <input
                  type="text"
                  value={profilForm.sahaAdi || ''}
                  onChange={(e) => setProfilForm({ ...profilForm, sahaAdi: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">WhatsApp / Telefon</label>
                <input
                  type="tel"
                  value={profilForm.telefon || ''}
                  onChange={(e) => setProfilForm({ ...profilForm, telefon: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">İlçe</label>
                <select
                  value={profilForm.ilce || ''}
                  onChange={(e) => setProfilForm({ ...profilForm, ilce: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Seç</option>
                  {ILCELER.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">Format</label>
                <select
                  value={profilForm.format || ''}
                  onChange={(e) => setProfilForm({ ...profilForm, format: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Seç</option>
                  <option value="5v5">5v5</option>
                  <option value="6v6">6v6</option>
                  <option value="7v7">7v7</option>
                  <option value="8v8">8v8</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">Saatlik Fiyat (₺)</label>
                <input
                  type="number"
                  value={profilForm.fiyat || ''}
                  onChange={(e) =>
                    setProfilForm({
                      ...profilForm,
                      fiyat: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">Kurallar / Notlar</label>
                <textarea
                  placeholder="Sahaya özel bilgilendirme..."
                  value={profilForm.kurallar || ''}
                  onChange={(e) => setProfilForm({ ...profilForm, kurallar: e.target.value })}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={kaydediliyor}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:bg-gray-300"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Profili Kaydet'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
