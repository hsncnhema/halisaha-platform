'use client';

import { kullaniciyiYonlendir, supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const router = useRouter();

  const signInWithGoogle = async () => {
    setError('');
    const redirectTo = window.location.origin + '/auth/callback';
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (oauthError) {
      setError('Google ile giriş başarısız.');
    }
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setYukleniyor(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError('Email veya şifre hatalı.');
      setYukleniyor(false);
      return;
    }

    const hedef = await kullaniciyiYonlendir(data.user);
    router.push(hedef);
    router.refresh();
    setYukleniyor(false);
  };

  return (
    <div className="mx-auto max-w-sm px-4 pb-16 pt-20">
      <h1 className="mb-1 text-2xl font-extrabold">Giriş Yap</h1>
      <p className="mb-8 text-sm text-gray-400">
        Hesabın yok mu?{' '}
        <Link href="/kayit" className="font-semibold text-green-600 hover:underline">
          Kayıt ol
        </Link>
      </p>

      <button
        onClick={signInWithGoogle}
        className="mb-6 w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90"
        style={{ background: '#4285F4' }}
      >
        Google ile Giriş Yap
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">veya</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={signInWithEmail} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-400 focus:outline-none"
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-green-400 focus:outline-none"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={yukleniyor}
          className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>

      <div className="mt-8 border-t border-gray-100 pt-6 text-center">
        <Link href="/kayit/halisaha" className="text-sm font-semibold text-green-600 hover:underline">
          🏟️ Halı saha olarak kayıt ol →
        </Link>
      </div>
    </div>
  );
}
