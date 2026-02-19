'use client';

import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (err) {
      setError('Google ile giriş başarısız.');
    }
  };

  const signInWithEmail = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err) {
      setError('Email veya şifre hatalı.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700 }}>Giriş Yap</h1>
      <p style={{ marginBottom: 24, color: '#6b7c6b', fontSize: 14 }}>
        Hesabın yok mu?{' '}
        <Link href="/kayit" style={{ color: '#16a34a', fontWeight: 600 }}>
          Kayıt ol
        </Link>
      </p>

      <button onClick={signInWithGoogle} style={{
        width: '100%', padding: 12, marginBottom: 24,
        background: '#4285F4', color: 'white', border: 'none',
        borderRadius: 8, cursor: 'pointer', fontSize: 16
      }}>
        Google ile Giriş Yap
      </button>

      <div style={{ textAlign: 'center', marginBottom: 24, color: '#aaa', fontSize: 13 }}>
        ─── veya ───
      </div>

      <form onSubmit={signInWithEmail}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Şifre"
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
          Giriş Yap
        </button>
      </form>

      <div style={{
        marginTop: 32, paddingTop: 20,
        borderTop: '1px solid #eee', textAlign: 'center'
      }}>
        <Link href="/kayit/halisaha" style={{
          fontSize: 13, color: '#16a34a', fontWeight: 600,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4
        }}>
          🏟️ Halı saha olarak kayıt ol →
        </Link>
      </div>
    </div>
  );
}