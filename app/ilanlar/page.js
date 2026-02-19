'use client';

import { db, auth } from '@/lib/firebase';
import {
  collection, addDoc, query, where,
  orderBy, onSnapshot, Timestamp
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

export default function IlanlarPage() {
  const [ilanlar, setIlanlar] = useState([]);
  const [kullanici, setKullanici] = useState(null);
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

  // Auth dinle
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setKullanici(user);
    });
    return () => unsub();
  }, []);

  // İlanları dinle
  useEffect(() => {
    const simdi = Timestamp.now();
    let q = query(
      collection(db, 'ilanlar'),
      where('silinmeZamani', '>', simdi),
      orderBy('silinmeZamani', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIlanlar(data);
      setYukleniyor(false);
    });
    return () => unsub();
  }, []);

  const ilanAc = async (e) => {
    e.preventDefault();
    if (!form.ilce || !form.baslik || !form.aciklama) {
      setError('Tüm zorunlu alanları doldur.');
      return;
    }
    setGonderiyor(true);
    try {
      const silinmeZamani = Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      );
      await addDoc(collection(db, 'ilanlar'), {
        ...form,
        uid: kullanici.uid,
        silinmeZamani,
        olusturulma: Timestamp.now(),
      });
      setFormAcik(false);
      setForm({ kategori: 'Oyuncu Arıyorum', ilce: '', baslik: '', aciklama: '', tarih: '', saat: '' });
      setError('');
    } catch (err) {
      setError('İlan açılamadı, tekrar dene.');
    }
    setGonderiyor(false);
  };

  const filtrelenmis = ilanlar.filter(i => {
    if (filtre.kategori && i.kategori !== filtre.kategori) return false;
    if (filtre.ilce && i.ilce !== filtre.ilce) return false;
    return true;
  });

  const kalanSure = (silinmeZamani) => {
    const fark = silinmeZamani.toDate() - new Date();
    const saat = Math.floor(fark / (1000 * 60 * 60));
    const dakika = Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60));
    if (saat <= 0 && dakika <= 0) return 'Süresi doldu';
    if (saat <= 0) return `${dakika}dk kaldı`;
    return `${saat}sa ${dakika}dk kaldı`;
  };

  const inputStyle = {
    width: '100%', padding: 10, borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14,
    boxSizing: 'border-box', background: 'white', marginBottom: 10
  };

  return (
    <div style={{ maxWidth: 680, margin: '60px auto', padding: 24 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <Link href="/" style={{ fontSize: 13, color: '#16a34a', textDecoration: 'none' }}>← Ana Sayfa</Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>📋 İlan Panosu</h1>
        </div>
        {kullanici ? (
          <button onClick={() => setFormAcik(!formAcik)} style={{
            padding: '10px 20px', background: '#16a34a', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700
          }}>
            {formAcik ? 'İptal' : '+ İlan Aç'}
          </button>
        ) : (
          <Link href="/login" style={{
            padding: '10px 20px', background: '#16a34a', color: 'white',
            borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700
          }}>
            İlan açmak için giriş yap
          </Link>
        )}
      </div>

      {/* İLAN FORMU */}
      {formAcik && (
        <div style={{
          background: 'white', border: '1.5px solid #86efac',
          borderRadius: 14, padding: 24, marginBottom: 24
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Yeni İlan</h3>
          <form onSubmit={ilanAc}>
            <select value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })} style={inputStyle}>
              <option value="Oyuncu Arıyorum">Oyuncu Arıyorum</option>
              <option value="Takım Arıyorum">Takım Arıyorum</option>
            </select>
            <select value={form.ilce} onChange={e => setForm({ ...form, ilce: e.target.value })} style={inputStyle}>
              <option value="">İlçe seç *</option>
              {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <input
              type="text"
              placeholder="Başlık * (örn: Kadıköy 20:00 için 2 oyuncu arıyorum)"
              value={form.baslik}
              onChange={e => setForm({ ...form, baslik: e.target.value })}
              style={inputStyle}
            />
            <textarea
              placeholder="Açıklama * (format, seviye, iletişim bilgisi...)"
              value={form.aciklama}
              onChange={e => setForm({ ...form, aciklama: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input
                type="date"
                value={form.tarih}
                onChange={e => setForm({ ...form, tarih: e.target.value })}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
              <input
                type="time"
                value={form.saat}
                onChange={e => setForm({ ...form, saat: e.target.value })}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
            {error && <p style={{ color: 'red', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <button type="submit" disabled={gonderiyor} style={{
              width: '100%', padding: 12, marginTop: 12,
              background: gonderiyor ? '#aaa' : '#16a34a',
              color: 'white', border: 'none', borderRadius: 8,
              cursor: gonderiyor ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700
            }}>
              {gonderiyor ? 'Gönderiliyor...' : 'İlan Yayınla'}
            </button>
          </form>
        </div>
      )}

      {/* FİLTRE */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          value={filtre.kategori}
          onChange={e => setFiltre({ ...filtre, kategori: e.target.value })}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #dde8dd', fontSize: 13, background: 'white' }}
        >
          <option value="">Tüm Kategoriler</option>
          <option value="Oyuncu Arıyorum">Oyuncu Arıyorum</option>
          <option value="Takım Arıyorum">Takım Arıyorum</option>
        </select>
        <select
          value={filtre.ilce}
          onChange={e => setFiltre({ ...filtre, ilce: e.target.value })}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #dde8dd', fontSize: 13, background: 'white' }}
        >
          <option value="">Tüm İlçeler</option>
          {ILCELER.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {/* İLAN LİSTESİ */}
      {yukleniyor ? (
        <p style={{ textAlign: 'center', color: '#6b7c6b' }}>Yükleniyor...</p>
      ) : filtrelenmis.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 48,
          background: 'white', borderRadius: 14,
          border: '1.5px solid #dde8dd', color: '#6b7c6b'
        }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
          <p style={{ fontWeight: 600 }}>Henüz ilan yok</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>İlk ilanı sen aç!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrelenmis.map(ilan => (
            <div key={ilan.id} style={{
              background: 'white', border: '1.5px solid #dde8dd',
              borderRadius: 12, padding: 18
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    background: ilan.kategori === 'Oyuncu Arıyorum' ? '#dcfce7' : '#dbeafe',
                    color: ilan.kategori === 'Oyuncu Arıyorum' ? '#166534' : '#1e40af',
                    padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700
                  }}>
                    {ilan.kategori}
                  </span>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                    📍 {ilan.ilce}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>
                  ⏱ {kalanSure(ilan.silinmeZamani)}
                </span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{ilan.baslik}</h3>
              <p style={{ fontSize: 13, color: '#6b7c6b', lineHeight: 1.5, marginBottom: 8 }}>{ilan.aciklama}</p>
              {(ilan.tarih || ilan.saat) && (
                <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  🗓 {ilan.tarih} {ilan.saat}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}