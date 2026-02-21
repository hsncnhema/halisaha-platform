'use client';

import { kullaniciyiYonlendir } from '@/lib/auth';
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
      const result = await signInWithPopup(auth, provider);
      await kullaniciyiYonlendir(result.user, router);
    } catch (err) {
      console.error(err);
      setError('Google ile giriş başarısız.');
    }
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await kullaniciyiYonlendir(result.user, router);
    } catch (err) {
      console.error(err);
      setError('Email veya şifre hatalı.');
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 pt-20 pb-16">
      <h1 className="text-2xl font-extrabold mb-1">Giriş Yap</h1>
      <p className="text-sm text-gray-400 mb-8">
        Hesabın yok mu?{' '}
        <Link href="/kayit" className="text-green-600 font-semibold hover:underline">Kayıt ol</Link>
      </p>

      <button
        onClick={signInWithGoogle}
        className="w-full py-3 rounded-xl text-white font-bold text-sm mb-6 transition hover:opacity-90"
        style={{ background: '#4285F4' }}
      >
        Google ile Giriş Yap
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">veya</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={signInWithEmail} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400"
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400"
        />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition"
        >
          Giriş Yap
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <Link href="/kayit/halisaha" className="text-sm text-green-600 font-semibold hover:underline">
          🏟️ Halı saha olarak kayıt ol →
        </Link>
      </div>
    </div>
  );
}
