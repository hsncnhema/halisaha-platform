'use client';

import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
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

const SAAT_SECENEKLERI = [
  '06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30',
  '18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30',
  '22:00','22:30','23:00','23:30','00:00','00:30','01:00','01:30','02:00'
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

const bugunTarih = () => new Date().toISOString().split('T')[0];

const sonrakiGunler = () => {
  const gunler = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    gunler.push(d.toISOString().split('T')[0]);
  }
  return gunler;
};

const tarihFormat = (tarih: string) => {
  const d = new Date(tarih + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const selectClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 bg-white";
const inputClass = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400";

export default function HalisahaPanelPage() {
  const [saha, setSaha] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aktifSekme, setAktifSekme] = useState('takvim');
  const [seciliGun, setSeciliGun] = useState(bugunTarih());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basari, setBasari] = useState('');
  const [profilForm, setProfilForm] = useState<any>({});
  const [kurulumForm, setKurulumForm] = useState({
    acilisSaati: '09:00',
    kapanisSaati: '23:00',
    slotSuresi: '60',
  });
  const [kurulumKaydediliyor, setKurulumKaydediliyor] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { router.push('/login'); return; }
      const snap = await getDoc(doc(db, 'sahalar', user.uid));
      if (!snap.exists()) { router.push('/login'); return; }
      const data = { ...snap.data(), uid: user.uid };
      setSaha(data);
      setProfilForm(data);
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  const kurulumKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setKurulumKaydediliyor(true);
    try {
      await updateDoc(doc(db, 'sahalar', saha.uid), {
        acilisSaati: kurulumForm.acilisSaati,
        kapanisSaati: kurulumForm.kapanisSaati,
        slotSuresi: Number(kurulumForm.slotSuresi),
        kurulumTamamlandi: true,
      });
      setSaha({ ...saha, ...kurulumForm, slotSuresi: Number(kurulumForm.slotSuresi), kurulumTamamlandi: true });
    } catch (err) { console.error(err); }
    setKurulumKaydediliyor(false);
  };

  const slotToggle = async (slot: string) => {
    const musaitlik = saha.musaitlik || {};
    const anahtar = `${seciliGun}_${slot}`;
    const yeniDurum = (musaitlik[anahtar] || 'bos') === 'bos' ? 'dolu' : 'bos';
    const yeniMusaitlik = { ...musaitlik, [anahtar]: yeniDurum };
    setSaha({ ...saha, musaitlik: yeniMusaitlik });
    try {
      await updateDoc(doc(db, 'sahalar', saha.uid), { musaitlik: yeniMusaitlik });
    } catch (err) { console.error(err); }
  };

  const profilKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setKaydediliyor(true);
    try {
      await updateDoc(doc(db, 'sahalar', saha.uid), {
        sahaAdi: profilForm.sahaAdi,
        telefon: profilForm.telefon,
        ilce: profilForm.ilce,
        format: profilForm.format,
        fiyat: Number(profilForm.fiyat),
        kurallar: profilForm.kurallar || '',
      });
      setSaha({ ...saha, ...profilForm });
      setBasari('Profil güncellendi!');
      setTimeout(() => setBasari(''), 3000);
    } catch (err) { console.error(err); }
    setKaydediliyor(false);
  };

  const cikisYap = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (yukleniyor) return (
    <div className="max-w-2xl mx-auto mt-24 px-4 text-center text-gray-400 text-sm">Yükleniyor...</div>
  );

  // KURULUM EKRANI
  if (!saha.kurulumTamamlandi) {
    const onizlemeSlotlar = slotlarUret(kurulumForm.acilisSaati, kurulumForm.kapanisSaati, Number(kurulumForm.slotSuresi));
    return (
      <div className="max-w-md mx-auto px-4 pb-16 pt-10">
        <h1 className="text-2xl font-extrabold mb-2">🏟️ Saha Kurulumu</h1>
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          Müsaitlik takvimini oluşturmak için çalışma saatlerini ve slot süresini belirle. Daha sonra değiştirebilirsin.
        </p>

        <form onSubmit={kurulumKaydet} className="flex flex-col gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Açılış Saati</label>
            <select value={kurulumForm.acilisSaati} onChange={e => setKurulumForm({ ...kurulumForm, acilisSaati: e.target.value })} className={selectClass}>
              {SAAT_SECENEKLERI.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2 mt-4">Kapanış Saati</label>
            <select value={kurulumForm.kapanisSaati} onChange={e => setKurulumForm({ ...kurulumForm, kapanisSaati: e.target.value })} className={selectClass}>
              {SAAT_SECENEKLERI.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2 mt-4">Slot Süresi</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '60 dakika', value: '60', ornek: '19:00-20:00' },
                { label: '90 dakika', value: '90', ornek: '19:00-20:30' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKurulumForm({ ...kurulumForm, slotSuresi: opt.value })}
                  className={`p-3 rounded-xl border-2 text-center transition ${
                    kurulumForm.slotSuresi === opt.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}
                >
                  <div className={`font-bold text-sm ${kurulumForm.slotSuresi === opt.value ? 'text-green-600' : 'text-gray-700'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">örn: {opt.ornek}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ÖNİZLEME */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-bold text-green-600 mb-2">ÖNİZLEME — İlk 4 Slot</p>
            <div className="flex flex-wrap gap-2">
              {onizlemeSlotlar.slice(0, 4).map(slot => (
                <span key={slot} className="bg-white border border-green-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-green-700">
                  {slot}
                </span>
              ))}
              <span className="text-xs text-gray-400 self-center">... toplam {onizlemeSlotlar.length} slot</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={kurulumKaydediliyor}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold text-sm rounded-xl transition"
          >
            {kurulumKaydediliyor ? 'Kaydediliyor...' : 'Kurulumu Tamamla →'}
          </button>
        </form>
      </div>
    );
  }

  // ANA PANEL
  const slotlar = slotlarUret(saha.acilisSaati, saha.kapanisSaati, saha.slotSuresi);
  const musaitlik = saha.musaitlik || {};
  const gunler = sonrakiGunler();
  const bugunDolu = slotlar.filter(s => musaitlik[`${seciliGun}_${s}`] === 'dolu').length;
  const bugunBos = slotlar.length - bugunDolu;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16 pt-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-extrabold mb-0.5">🏟️ {saha.sahaAdi}</h1>
          <p className={`text-xs font-bold ${saha.durum === 'aktif' ? 'text-green-600' : 'text-amber-500'}`}>
            {saha.durum === 'aktif' ? '✅ Yayında' : '🕐 Onay Bekliyor'}
          </p>
        </div>
        <button onClick={cikisYap} className="px-3 py-2 border border-gray-200 bg-white rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition">
          Çıkış
        </button>
      </div>

      {/* DASHBOARD ÖZET */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold text-green-600">{bugunBos}</div>
          <div className="text-xs text-gray-400 mt-1">Bugün Boş</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold text-red-500">{bugunDolu}</div>
          <div className="text-xs text-gray-400 mt-1">Bugün Dolu</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold text-blue-600">{saha.format || '—'}</div>
          <div className="text-xs text-gray-400 mt-1">Format</div>
        </div>
      </div>

      {/* SEKMELER */}
      <div className="flex gap-1 mb-6 bg-green-50 rounded-xl p-1">
        {[
          { id: 'takvim', label: '📅 Takvim' },
          { id: 'profil', label: '⚙️ Profil' },
        ].map(sekme => (
          <button
            key={sekme.id}
            onClick={() => setAktifSekme(sekme.id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
              aktifSekme === sekme.id
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {sekme.label}
          </button>
        ))}
      </div>

      {/* TAKVİM */}
      {aktifSekme === 'takvim' && (
        <div>
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {gunler.map(gun => (
              <button
                key={gun}
                onClick={() => setSeciliGun(gun)}
                className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-bold transition whitespace-nowrap ${
                  seciliGun === gun
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
                }`}
              >
                {tarihFormat(gun)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {slotlar.map(slot => {
              const bos = (musaitlik[`${seciliGun}_${slot}`] || 'bos') === 'bos';
              return (
                <button
                  key={slot}
                  onClick={() => slotToggle(slot)}
                  className={`flex justify-between items-center px-4 py-3.5 rounded-xl border-2 w-full transition ${
                    bos
                      ? 'bg-green-50 border-green-200 hover:border-green-400'
                      : 'bg-red-50 border-red-200 hover:border-red-400'
                  }`}
                >
                  <span className="font-bold text-sm">{slot}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    bos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {bos ? '✅ Boş' : '❌ Dolu'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-300 text-center mt-4">Slota tıklayarak boş / dolu olarak işaretle</p>
        </div>
      )}

      {/* PROFİL */}
      {aktifSekme === 'profil' && (
        <div>
          {basari && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 font-semibold">
              ✅ {basari}
            </div>
          )}
          <form onSubmit={profilKaydet} className="flex flex-col gap-3">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Saha Adı</label>
                <input type="text" value={profilForm.sahaAdi || ''} onChange={e => setProfilForm({ ...profilForm, sahaAdi: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">WhatsApp / Telefon</label>
                <input type="tel" value={profilForm.telefon || ''} onChange={e => setProfilForm({ ...profilForm, telefon: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">İlçe</label>
                <select value={profilForm.ilce || ''} onChange={e => setProfilForm({ ...profilForm, ilce: e.target.value })} className={selectClass}>
                  <option value="">Seç</option>
                  {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Format</label>
                <select value={profilForm.format || ''} onChange={e => setProfilForm({ ...profilForm, format: e.target.value })} className={selectClass}>
                  <option value="">Seç</option>
                  <option value="5v5">5v5</option>
                  <option value="6v6">6v6</option>
                  <option value="7v7">7v7</option>
                  <option value="8v8">8v8</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Saatlik Fiyat (₺)</label>
                <input type="number" value={profilForm.fiyat || ''} onChange={e => setProfilForm({ ...profilForm, fiyat: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Kurallar / Notlar</label>
                <textarea
                  placeholder="Sahaya özel bilgilendirme..."
                  value={profilForm.kurallar || ''}
                  onChange={e => setProfilForm({ ...profilForm, kurallar: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 resize-y"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={kaydediliyor}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold text-sm rounded-xl transition"
            >
              {kaydediliyor ? 'Kaydediliyor...' : 'Profili Kaydet'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
