'use client';

import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function KayitPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ad, setAd] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const kayitOl = async (uid, email, ad) => {
    await setDoc(doc(db, 'users', uid), {
      ad,
      email,
      rol: 'futbolcu',
      olusturulma: new Date(),
    });
    router.push('/profil-tamamla');
  };

  const googleIleKayit = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await kayitOl(user.uid, user.email, user.displayName);
    } catch (err) {
      setError('Google ile kayıt başarısız.');
    }
  };

  const emailIleKayit = async (e) => {
    e.preventDefault();
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await kayitOl(result.user.uid, email, ad);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Bu email zaten kayıtlı.');
      } else if (err.code === 'auth/weak-password') {
        setError('Şifre en az 6 karakter olmalı.');
      } else {
        setError('Kayıt başarısız, tekrar dene.');
      }
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700 }}>⚽ Futbolcu Kayıt</h1>
      <p style={{ marginBottom: 24, color: '#6b7c6b', fontSize: 14 }}>
        Zaten hesabın var mı?{' '}
        <Link href="/login" style={{ color: '#16a34a', fontWeight: 600 }}>
          Giriş yap
        </Link>
      </p>

      <button onClick={googleIleKayit} style={{
        width: '100%', padding: 12, marginBottom: 24,
        background: '#4285F4', color: 'white', border: 'none',
        borderRadius: 8, cursor: 'pointer', fontSize: 16
      }}>
        Google ile Kayıt Ol
      </button>

      <div style={{ textAlign: 'center', marginBottom: 24, color: '#aaa', fontSize: 13 }}>
        ─── veya ───
      </div>

      <form onSubmit={emailIleKayit}>
        <input
          type="text"
          placeholder="Adın Soyadın"
          value={ad}
          onChange={e => setAd(e.target.value)}
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
        />
        <input
          type="email"
          placeholder="Email"
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
          width: '100%', padding: 12,
          background: '#16a34a', color: 'white', border: 'none',
          borderRadius: 8, cursor: 'pointer', fontSize: 16
        }}>
          Kayıt Ol
        </button>
      </form>

      <div style={{
        marginTop: 32, paddingTop: 20,
        borderTop: '1px solid #eee', textAlign: 'center'
      }}>
        <Link href="/kayit/halisaha" style={{
          fontSize: 13, color: '#16a34a', fontWeight: 600,
          textDecoration: 'none'
        }}>
          🏟️ Halı saha olarak kayıt ol →
        </Link>
      </div>
    </div>
  );
}