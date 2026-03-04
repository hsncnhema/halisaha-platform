'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabase } from '@/lib/supabase';
import { ILCELER, ILLER } from '@/lib/turkiye';

type GeocodeResponse = {
  status?: string;
  results?: Array<{
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
};

const authHataMesaji = (mesaj: string | undefined) => {
  const normalized = (mesaj ?? '').toLowerCase();

  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'Bu email zaten kayitli.';
  }

  if (normalized.includes('password')) {
    return 'Sifre en az 6 karakter olmali.';
  }

  return 'Kayit basarisiz, tekrar dene.';
};

const adresiKoordinataCevir = async (adres: string): Promise<{ lat: number | null; lng: number | null }> => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  if (!apiKey || !adres.trim()) {
    return { lat: null, lng: null };
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', adres);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return { lat: null, lng: null };
    }

    const payload = (await response.json()) as GeocodeResponse;
    const konum = payload.results?.[0]?.geometry?.location;
    if (payload.status === 'OK' && typeof konum?.lat === 'number' && typeof konum?.lng === 'number') {
      return { lat: konum.lat, lng: konum.lng };
    }
  } catch (err) {
    console.log('geocoding error:', err);
  }

  return { lat: null, lng: null };
};

export default function HalisahaKayitPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sahaAdi, setSahaAdi] = useState('');
  const [telefon, setTelefon] = useState('');
  const [sokak, setSokak] = useState('');
  const [ilce, setIlce] = useState('');
  const [il, setIl] = useState('');
  const [error, setError] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const router = useRouter();
  const ilceler = il ? ILCELER(il) : [];

  const kayitOl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!sahaAdi || !telefon || !email || !password || !sokak || !ilce || !il) {
      setError('Tum alanlar zorunlu.');
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

    const user = data.user;
    if (authError || !user) {
      setError(authHataMesaji(authError?.message));
      setKaydediliyor(false);
      return;
    }

    const { data: profileUpdated, error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        ad: sahaAdi,
        tip: 'saha',
        email: user.email ?? email,
      })
      .eq('id', user.id)
      .select('id')
      .maybeSingle();

    if (profileUpdateError) {
      console.log('profiles update error:', profileUpdateError);
      setError('Profil kaydi guncellenemedi.');
      setKaydediliyor(false);
      return;
    }

    if (!profileUpdated) {
      const { error: profileUpsertError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          ad: sahaAdi,
          tip: 'saha',
          email: user.email ?? email,
        },
        { onConflict: 'id' }
      );

      if (profileUpsertError) {
        console.log('profiles upsert error:', profileUpsertError);
        setError('Profil kaydi olusturulamadi.');
        setKaydediliyor(false);
        return;
      }
    }

    const tamAdres = `${sokak}, ${ilce}, ${il}`;
    const { lat, lng } = await adresiKoordinataCevir(tamAdres);

    const { error: sahaError } = await supabase.from('sahalar').upsert(
      {
        user_id: user.id,
        saha_adi: sahaAdi,
        telefon,
        il,
        ilce,
        lat,
        lng,
        durum: 'beklemede',
      },
      { onConflict: 'user_id' }
    );

    if (sahaError) {
      console.log('sahalar upsert error:', sahaError);
      setError('Saha basvurusu kaydedilemedi.');
      setKaydediliyor(false);
      return;
    }

    router.push('/halisaha/beklemede');
    router.refresh();
    setKaydediliyor(false);
  };

  return (
    <div className="mx-auto mt-20 min-h-screen bg-green-950 max-w-md px-4">
      <h1 className="mb-2 text-2xl font-bold text-white">Hali Saha Kayit</h1>
      <p className="mb-6 text-sm text-white/40">Kaydiniz admin onayindan sonra yayina alinacaktir.</p>

      <form onSubmit={kayitOl} className="space-y-3">
        <input
          type="text"
          placeholder="Saha Adi *"
          value={sahaAdi}
          onChange={(e) => setSahaAdi(e.target.value)}
          className="w-full rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm outline-none focus:border-green-400"
        />
        <input
          type="tel"
          placeholder="Telefon / WhatsApp *"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          className="w-full rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm outline-none focus:border-green-400"
        />
        <input
          type="email"
          placeholder="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm outline-none focus:border-green-400"
        />
        <input
          type="password"
          placeholder="Sifre (en az 6 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm outline-none focus:border-green-400"
        />
        <input
          type="text"
          placeholder="Sokak / Mahalle / Acik Adres *"
          value={sokak}
          onChange={(e) => setSokak(e.target.value)}
          className="w-full rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 text-sm outline-none focus:border-green-400"
        />
        <select
          value={il}
          onChange={(e) => {
            setIl(e.target.value);
            setIlce('');
          }}
          className="bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2"
        >
          <option value="">Il sec *</option>
          {ILLER.map((sehir) => (
            <option key={sehir} value={sehir}>
              {sehir}
            </option>
          ))}
        </select>
        <select
          value={ilce}
          onChange={(e) => setIlce(e.target.value)}
          disabled={!il}
          className="bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2"
        >
          <option value="">{il ? 'Ilce sec *' : 'Once il sec *'}</option>
          {ilceler.map((seciliIlce) => (
            <option key={seciliIlce} value={seciliIlce}>
              {seciliIlce}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={kaydediliyor}
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
        >
          {kaydediliyor ? 'Gonderiliyor...' : 'Basvuru Gonder'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        <Link href="/login" className="text-green-400 hover:underline">
          Giris sayfasina don
        </Link>
      </p>
    </div>
  );
}
