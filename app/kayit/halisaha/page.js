'use client';

import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HalisahaKayitPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sahaAdi, setSahaAdi] = useState('');
  const [telefon, setTelefon] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const kayitOl = async (e) => {
    e.preventDefault();
    if (!sahaAdi || !telefon) { setError('Tüm alanlar zorunlu.'); return; }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'sahalar', result.user.uid), {
        sahaAdi,
        email,
        telefon,
        durum: 'beklemede',
        olusturulma: new Date(),
      });
      router.push('/halisaha/beklemede');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Bu email zaten kayıtlı.');
      else if (err.code === 'auth/weak-password') setError('Şifre en az 6 karakter olmalı.');
      else setError('Kayıt başarısız, tekrar dene.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700 }}>🏟️ Halı Saha Kayıt</h1>
      <p style={{ marginBottom: 24, color: '#6b7c6b', fontSize: 14 }}>
        Kaydınız admin onayından sonra yayına alınacaktır.
      </p>

      <form onSubmit={kayitOl}>
        <input
          type="text"
          placeholder="Saha Adı *"
          value={sahaAdi}
          onChange={e => setSahaAdi(e.target.value)}
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
        />
        <input
          type="tel"
          placeholder="Telefon / WhatsApp *"
          value={telefon}
          onChange={e => setTelefon(e.target.value)}
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
        />
        <input
          type="email"
          placeholder="Email *"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Şifre (en az 6 karakter)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
        />
        {error && <p style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>{error}</p>}
        <button type="submit" style={{
          width: '100%', padding: 12, background: '#16a34a', color: 'white',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16
        }}>
          Başvuru Gönder
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#aaa' }}>
        <Link href="/login" style={{ color: '#16a34a' }}>Giriş sayfasına dön</Link>
      </p>
    </div>
  );
}