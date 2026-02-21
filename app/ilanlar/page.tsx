'use client';

import { db, auth } from '@/lib/firebase';
import {
  collection, addDoc, query, where,
  orderBy, onSnapshot, Timestamp, getDocs
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
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

const kategoriRenk: Record<string, string> = {
  'Oyuncu Arıyorum': 'bg-green-100 text-green-800',
  'Takım Arıyorum': 'bg-blue-100 text-blue-800',
  'Duyuru': 'bg-slate-100 text-slate-600',
};

export default function IlanlarPage() {
  const [ilanlar, setIlanlar] = useState<any[]>([]);
  const [kullanici, setKullanici] = useState<any>(null);
  const [kullaniciTip, setKullaniciTip] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [filtre, setFiltre] = useState({ kategori: '', ilce: '' });
  const [form, setForm] = useState({
    kategori: 'Oyuncu Arıyorum',
    ilce: '',
    baslik: '',
    aciklama: '',
    tarih: '',
    saat: '',
  });
  const [gonderiyor, setGonderiyor] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setKullanici(user);
        const futbolcuSnap = await getDocs(
          query(collection(db, 'futbolcular'), where('__name__', '==', user.uid))
        );
        setKullaniciTip(futbolcuSnap.empty ? 'saha' : 'futbolcu');
      } else {
        setKullanici(null);
        setKullaniciTip(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const simdi = Timestamp.now();
    const q = query(
      collection(db, 'ilanlar'),
      where('silinmeZamani', '>', simdi),
      orderBy('silinmeZamani', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setIlanlar(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  const ilanAc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ilce || !form.baslik || !form.aciklama) {
      setError('Tüm zorunlu alanları doldur.');
      return;
    }
    setGonderiyor(true);
    try {
      await addDoc(collection(db, 'ilanlar'), {
        ...form,
        uid: kullanici.uid,
        acanTip: kullaniciTip,
        silinmeZamani: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        olusturulma: Timestamp.now(),
      });
      setFormAcik(false);
      setForm({ kategori: 'Oyuncu Arıyorum', ilce: '', baslik: '', aciklama: '', tarih: '', saat: '' });
      setError('');
    } catch {
      setError('İlan açılamadı, tekrar dene.');
    }
    setGonderiyor(false);
  };

  const filtrelenmis = ilanlar.filter(i => {
    if (filtre.kategori && i.kategori !== filtre.kategori) return false;
    if (filtre.ilce && i.ilce !== filtre.ilce) return false;
    return true;
  });

  const kalanSure = (silinmeZamani: any) => {
    const fark = silinmeZamani.toDate() - new Date();
    const saat = Math.floor(fark / (1000 * 60 * 60));
    const dakika = Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60));
    if (saat <= 0 && dakika <= 0) return 'Süresi doldu';
    if (saat <= 0) return `${dakika}dk kaldı`;
    return `${saat}sa ${dakika}dk kaldı`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16 pt-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/" className="text-sm text-green-600 hover:underline">← Ana Sayfa</Link>
          <h1 className="text-2xl font-extrabold mt-1">📋 İlan Panosu</h1>
        </div>
        {kullanici ? (
          <button
            onClick={() => setFormAcik(!formAcik)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              formAcik
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {formAcik ? 'İptal' : '+ İlan Aç'}
          </button>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition"
          >
            Giriş Yap
          </Link>
        )}
      </div>

      {/* İLAN FORMU */}
      {formAcik && (
        <div className="bg-white border border-green-200 rounded-2xl p-5 mb-5">
          <h3 className="text-base font-bold mb-4">Yeni İlan</h3>
          <form onSubmit={ilanAc} className="flex flex-col gap-3">
            <select
              value={form.kategori}
              onChange={e => setForm({ ...form, kategori: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 bg-white"
            >
              <option value="Oyuncu Arıyorum">Oyuncu Arıyorum</option>
              <option value="Takım Arıyorum">Takım Arıyorum</option>
              {kullaniciTip === 'saha' && <option value="Duyuru">Duyuru</option>}
            </select>
            <select
              value={form.ilce}
              onChange={e => setForm({ ...form, ilce: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 bg-white"
            >
              <option value="">İlçe seç *</option>
              {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <input
              type="text"
              placeholder="Başlık *"
              value={form.baslik}
              onChange={e => setForm({ ...form, baslik: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400"
            />
            <textarea
              placeholder="Açıklama * (format, seviye, iletişim bilgisi...)"
              value={form.aciklama}
              onChange={e => setForm({ ...form, aciklama: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 resize-y"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.tarih}
                onChange={e => setForm({ ...form, tarih: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400"
              />
              <input
                type="time"
                value={form.saat}
                onChange={e => setForm({ ...form, saat: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400"
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={gonderiyor}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold text-sm rounded-xl transition"
            >
              {gonderiyor ? 'Gönderiliyor...' : 'İlan Yayınla'}
            </button>
          </form>
        </div>
      )}

      {/* FİLTRE */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <select
          value={filtre.kategori}
          onChange={e => setFiltre({ ...filtre, kategori: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white cursor-pointer focus:outline-none focus:border-green-400"
        >
          <option value="">Tüm Kategoriler</option>
          <option value="Oyuncu Arıyorum">Oyuncu Arıyorum</option>
          <option value="Takım Arıyorum">Takım Arıyorum</option>
          <option value="Duyuru">Duyuru</option>
        </select>
        <select
          value={filtre.ilce}
          onChange={e => setFiltre({ ...filtre, ilce: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white cursor-pointer focus:outline-none focus:border-green-400"
        >
          <option value="">Tüm İlçeler</option>
          {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        {(filtre.kategori || filtre.ilce) && (
          <button
            onClick={() => setFiltre({ kategori: '', ilce: '' })}
            className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition"
          >
            Temizle ✕
          </button>
        )}
      </div>

      {/* İLAN LİSTESİ */}
      {yukleniyor ? (
        <div className="text-center py-16 text-gray-400 text-sm">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-bold text-gray-700">Henüz ilan yok</p>
          <p className="text-sm text-gray-400 mt-1">İlk ilanı sen aç!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrelenmis.map(ilan => (
            <div key={ilan.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-green-200 transition">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${kategoriRenk[ilan.kategori] || 'bg-slate-100 text-slate-600'}`}>
                    {ilan.kategori}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                    📍 {ilan.ilce}
                  </span>
                  {ilan.acanTip === 'saha' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                      🏟️ Saha
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">⏱ {kalanSure(ilan.silinmeZamani)}</span>
              </div>
              <h3 className="text-sm font-bold mb-1">{ilan.baslik}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-2">{ilan.aciklama}</p>
              {(ilan.tarih || ilan.saat) && (
                <p className="text-xs text-green-600 font-semibold">🗓 {ilan.tarih} {ilan.saat}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
