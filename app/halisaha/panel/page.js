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

// Gece yarısını geçen saatleri de destekler
const saatiDakikayaCevir = (saat) => {
  const [h, m] = saat.split(':').map(Number);
  return h * 60 + m;
};

const dakikayaSaateCevir = (dakika) => {
  const normalDakika = dakika % (24 * 60);
  const h = Math.floor(normalDakika / 60);
  const m = normalDakika % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

const slotlarUret = (acilis, kapanis, slotSuresi) => {
  const slotlar = [];
  let baslangic = saatiDakikayaCevir(acilis);
  let bitis = saatiDakikayaCevir(kapanis);

  // Gece yarısını geçen durum: örn 19:30 → 01:30
  if (bitis <= baslangic) {
    bitis += 24 * 60;
  }

  while (baslangic + slotSuresi <= bitis) {
    const slotBaslangic = dakikayaSaateCevir(baslangic);
    const slotBitis = dakikayaSaateCevir(baslangic + slotSuresi);
    slotlar.push(`${slotBaslangic}-${slotBitis}`);
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

const tarihFormat = (tarih) => {
  const d = new Date(tarih + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function HalisahaPanelPage() {
  const [saha, setSaha] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aktifSekme, setAktifSekme] = useState('takvim');
  const [seciliGun, setSeciliGun] = useState(bugunTarih());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basari, setBasari] = useState('');
  const [profilForm, setProfilForm] = useState({});
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

  const kurulumKaydet = async (e) => {
    e.preventDefault();
    setKurulumKaydediliyor(true);
    try {
      await updateDoc(doc(db, 'sahalar', saha.uid), {
        acilisSaati: kurulumForm.acilisSaati,
        kapanisSaati: kurulumForm.kapanisSaati,
        slotSuresi: Number(kurulumForm.slotSuresi),
        kurulumTamamlandi: true,
      });
      setSaha({
        ...saha,
        acilisSaati: kurulumForm.acilisSaati,
        kapanisSaati: kurulumForm.kapanisSaati,
        slotSuresi: Number(kurulumForm.slotSuresi),
        kurulumTamamlandi: true,
      });
    } catch (err) {
      console.error(err);
    }
    setKurulumKaydediliyor(false);
  };

  const slotToggle = async (slot) => {
    const musaitlik = saha.musaitlik || {};
    const anahtar = `${seciliGun}_${slot}`;
    const mevcutDurum = musaitlik[anahtar] || 'bos';
    const yeniDurum = mevcutDurum === 'bos' ? 'dolu' : 'bos';
    const yeniMusaitlik = { ...musaitlik, [anahtar]: yeniDurum };
    setSaha({ ...saha, musaitlik: yeniMusaitlik });
    try {
      await updateDoc(doc(db, 'sahalar', saha.uid), { musaitlik: yeniMusaitlik });
    } catch (err) {
      console.error(err);
    }
  };

  const profilKaydet = async (e) => {
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
    } catch (err) {
      console.error(err);
    }
    setKaydediliyor(false);
  };

  const cikisYap = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (yukleniyor) return (
    <div style={{ maxWidth: 800, margin: '100px auto', padding: 24, textAlign: 'center' }}>
      <p style={{ color: '#6b7c6b' }}>Yükleniyor...</p>
    </div>
  );

  // KURULUM EKRANI
  if (!saha.kurulumTamamlandi) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>🏟️ Saha Kurulumu</h1>
        <p style={{ color: '#6b7c6b', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Müsaitlik takvimini oluşturmak için çalışma saatlerini ve slot süresini belirle.
          Bunu daha sonra profil ayarlarından değiştirebilirsin.
        </p>

        <form onSubmit={kurulumKaydet}>
          <div style={{ background: 'white', border: '1.5px solid #dde8dd', borderRadius: 14, padding: 24, marginBottom: 16 }}>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374137', marginBottom: 4 }}>
              Açılış Saati
            </label>
            <select
              value={kurulumForm.acilisSaati}
              onChange={e => setKurulumForm({ ...kurulumForm, acilisSaati: e.target.value })}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            >
              {SAAT_SECENEKLERI.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374137', marginBottom: 4 }}>
              Kapanış Saati
            </label>
            <select
              value={kurulumForm.kapanisSaati}
              onChange={e => setKurulumForm({ ...kurulumForm, kapanisSaati: e.target.value })}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            >
              {SAAT_SECENEKLERI.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374137', marginBottom: 4 }}>
              Slot Süresi
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: '60 dakika', value: '60', ornek: '19:00-20:00' },
                { label: '90 dakika', value: '90', ornek: '19:00-20:30' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKurulumForm({ ...kurulumForm, slotSuresi: opt.value })}
                  style={{
                    flex: 1, padding: '12px 8px', borderRadius: 10,
                    border: '1.5px solid',
                    borderColor: kurulumForm.slotSuresi === opt.value ? '#16a34a' : '#dde8dd',
                    background: kurulumForm.slotSuresi === opt.value ? '#f0fdf4' : 'white',
                    cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: kurulumForm.slotSuresi === opt.value ? '#16a34a' : '#374137' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7c6b', marginTop: 2 }}>örn: {opt.ornek}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ÖNIZLEME */}
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>ÖNİZLEME — İlk 4 Slot</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {slotlarUret(kurulumForm.acilisSaati, kurulumForm.kapanisSaati, Number(kurulumForm.slotSuresi))
                .slice(0, 4)
                .map(slot => (
                  <span key={slot} style={{
                    background: 'white', border: '1.5px solid #86efac',
                    borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 600, color: '#16a34a'
                  }}>
                    {slot}
                  </span>
                ))}
              <span style={{ fontSize: 12, color: '#6b7c6b', alignSelf: 'center' }}>
                ... toplam {slotlarUret(kurulumForm.acilisSaati, kurulumForm.kapanisSaati, Number(kurulumForm.slotSuresi)).length} slot
              </span>
            </div>
          </div>

          <button type="submit" disabled={kurulumKaydediliyor} style={{
            width: '100%', padding: 13,
            background: kurulumKaydediliyor ? '#aaa' : '#16a34a',
            color: 'white', border: 'none', borderRadius: 8,
            cursor: kurulumKaydediliyor ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700
          }}>
            {kurulumKaydediliyor ? 'Kaydediliyor...' : 'Kurulumu Tamamla →'}
          </button>
        </form>
      </div>
    );
  }

  // ANA PANEL
  const slotlar = slotlarUret(saha.acilisSaati, saha.kapanisSaati, saha.slotSuresi);
  const musaitlik = saha.musaitlik || {};
  const bugunDolu = slotlar.filter(s => musaitlik[`${seciliGun}_${s}`] === 'dolu').length;
  const bugunBos = slotlar.length - bugunDolu;
  const gunler = sonrakiGunler();

  const inputStyle = {
    width: '100%', padding: 10, borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14,
    boxSizing: 'border-box', background: 'white', marginBottom: 12
  };
  const labelStyle = {
    fontSize: 12, fontWeight: 700, color: '#6b7c6b',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 4, display: 'block'
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>🏟️ {saha.sahaAdi}</h1>
          <p style={{ fontSize: 12, color: saha.durum === 'aktif' ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
            {saha.durum === 'aktif' ? '✅ Yayında' : '🕐 Onay Bekliyor'}
          </p>
        </div>
        <button onClick={cikisYap} style={{
          padding: '8px 14px', border: '1.5px solid #ddd',
          background: 'white', borderRadius: 8, cursor: 'pointer',
          fontSize: 12, color: '#6b7c6b'
        }}>
          Çıkış
        </button>
      </div>

      {/* DASHBOARD ÖZET */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{bugunBos}</div>
          <div style={{ fontSize: 11, color: '#6b7c6b', marginTop: 2 }}>Bugün Boş</div>
        </div>
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{bugunDolu}</div>
          <div style={{ fontSize: 11, color: '#6b7c6b', marginTop: 2 }}>Bugün Dolu</div>
        </div>
        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{saha.format || '—'}</div>
          <div style={{ fontSize: 11, color: '#6b7c6b', marginTop: 2 }}>Format</div>
        </div>
      </div>

      {/* SEKMELER */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f0f7f0', borderRadius: 10, padding: 4 }}>
        {[
          { id: 'takvim', label: '📅 Takvim' },
          { id: 'profil', label: '⚙️ Profil' },
        ].map(sekme => (
          <button key={sekme.id} onClick={() => setAktifSekme(sekme.id)} style={{
            flex: 1, padding: '10px 0', border: 'none', borderRadius: 8,
            cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: aktifSekme === sekme.id ? 'white' : 'transparent',
            color: aktifSekme === sekme.id ? '#16a34a' : '#6b7c6b',
            boxShadow: aktifSekme === sekme.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>
            {sekme.label}
          </button>
        ))}
      </div>

      {/* TAKVİM */}
      {aktifSekme === 'takvim' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {gunler.map(gun => (
              <button key={gun} onClick={() => setSeciliGun(gun)} style={{
                padding: '8px 12px', borderRadius: 10, border: '1.5px solid',
                borderColor: seciliGun === gun ? '#16a34a' : '#dde8dd',
                background: seciliGun === gun ? '#16a34a' : 'white',
                color: seciliGun === gun ? 'white' : '#374137',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0
              }}>
                {tarihFormat(gun)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slotlar.map(slot => {
              const anahtar = `${seciliGun}_${slot}`;
              const durum = musaitlik[anahtar] || 'bos';
              const bos = durum === 'bos';
              return (
                <button key={slot} onClick={() => slotToggle(slot)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 18px', borderRadius: 10, border: '1.5px solid',
                  borderColor: bos ? '#86efac' : '#fecaca',
                  background: bos ? '#f0fdf4' : '#fef2f2',
                  cursor: 'pointer', width: '100%'
                }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{slot}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: bos ? '#16a34a' : '#dc2626',
                    background: bos ? '#dcfce7' : '#fecaca',
                    padding: '3px 10px', borderRadius: 99
                  }}>
                    {bos ? '✅ Boş' : '❌ Dolu'}
                  </span>
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 16 }}>
            Slota tıklayarak boş / dolu olarak işaretle
          </p>
        </div>
      )}

      {/* PROFİL */}
      {aktifSekme === 'profil' && (
        <div>
          {basari && (
            <div style={{
              background: '#f0fdf4', border: '1.5px solid #86efac',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              fontSize: 14, color: '#166534', fontWeight: 600
            }}>
              ✅ {basari}
            </div>
          )}
          <form onSubmit={profilKaydet}>
            <div style={{ background: 'white', border: '1.5px solid #dde8dd', borderRadius: 12, padding: 20, marginBottom: 12 }}>
              <label style={labelStyle}>Saha Adı</label>
              <input type="text" value={profilForm.sahaAdi || ''} onChange={e => setProfilForm({ ...profilForm, sahaAdi: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>WhatsApp / Telefon</label>
              <input type="tel" value={profilForm.telefon || ''} onChange={e => setProfilForm({ ...profilForm, telefon: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>İlçe</label>
              <select value={profilForm.ilce || ''} onChange={e => setProfilForm({ ...profilForm, ilce: e.target.value })} style={inputStyle}>
                <option value="">Seç</option>
                {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
              </select>

              <label style={labelStyle}>Format</label>
              <select value={profilForm.format || ''} onChange={e => setProfilForm({ ...profilForm, format: e.target.value })} style={inputStyle}>
                <option value="">Seç</option>
                <option value="5v5">5v5</option>
                <option value="6v6">6v6</option>
                <option value="7v7">7v7</option>
                <option value="8v8">8v8</option>
              </select>

              <label style={labelStyle}>Saatlik Fiyat (₺)</label>
              <input type="number" value={profilForm.fiyat || ''} onChange={e => setProfilForm({ ...profilForm, fiyat: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Kurallar / Notlar</label>
              <textarea
                placeholder="Sahaya özel bilgilendirme..."
                value={profilForm.kurallar || ''}
                onChange={e => setProfilForm({ ...profilForm, kurallar: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <button type="submit" disabled={kaydediliyor} style={{
              width: '100%', padding: 13,
              background: kaydediliyor ? '#aaa' : '#16a34a',
              color: 'white', border: 'none', borderRadius: 8,
              cursor: kaydediliyor ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700
            }}>
              {kaydediliyor ? 'Kaydediliyor...' : 'Profili Kaydet'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}