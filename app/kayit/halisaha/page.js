'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HalisahaKayitPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sahaAdi, setSahaAdi] = useState('');
  const [telefon, setTelefon] = useState('');
  const [error, setError] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const router = useRouter();

  const kayitOl = async (e) => {
    e.preventDefault();
    if (!sahaAdi || !telefon || !email || !password) {
      setError('Tüm alanlar zorunlu.');
      return;
    }

    setKaydediliyor(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          tip: 'saha',
          ad: sahaAdi,
        },
      },
    });

    if (authError || !data.user) {
      if (authError?.message.toLowerCase().includes('already registered')) {
        setError('Bu email zaten kayıtlı.');
      } else if (authError?.message.toLowerCase().includes('password')) {
        setError('Şifre en az 6 karakter olmalı.');
      } else {
        setError('Kayıt başarısız, tekrar dene.');
      }
      setKaydediliyor(false);
      return;
    }

    await supabase.from('profiles').upsert(
      {
        id: data.user.id,
        ad: sahaAdi,
        tip: 'saha',
      },
      { onConflict: 'id' }
    );

    await supabase.from('sahalar').upsert(
      {
        user_id: data.user.id,
        saha_adi: sahaAdi,
        telefon,
        il: 'İstanbul',
        durum: 'beklemede',
      },
      { onConflict: 'user_id' }
    );

    router.push('/halisaha/beklemede');
    router.refresh();
    setKaydediliyor(false);
  };

  return (
    <div className="mx-auto mt-20 max-w-md px-4">
      <h1 className="mb-2 text-2xl font-bold">🏟️ Halı Saha Kayıt</h1>
      <p className="mb-6 text-sm text-gray-500">
        Kaydınız admin onayından sonra yayına alınacaktır.
      </p>

      <form onSubmit={kayitOl} className="space-y-3">
        <input
          type="text"
          placeholder="Saha Adı *"
          value={sahaAdi}
          onChange={(e) => setSahaAdi(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-400"
        />
        <input
          type="tel"
          placeholder="Telefon / WhatsApp *"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-400"
        />
        <input
          type="email"
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-400"
        />
        <input
          type="password"
          placeholder="Şifre (en az 6 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-400"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={kaydediliyor}
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {kaydediliyor ? 'Gönderiliyor...' : 'Başvuru Gönder'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        <Link href="/login" className="text-green-600 hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
