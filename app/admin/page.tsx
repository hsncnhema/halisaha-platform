'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type SahaBasvuru = {
  id: string;
  saha_adi: string;
  telefon: string;
  il: string | null;
  ilce: string | null;
  created_at: string;
};

export default function AdminPage() {
  const [adminAd, setAdminAd] = useState('');
  const [bekleyenSahalar, setBekleyenSahalar] = useState<SahaBasvuru[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [islemdeSahaId, setIslemdeSahaId] = useState<string | null>(null);
  const router = useRouter();

  const bekleyenSahalariGetir = useCallback(async () => {
    const { data, error } = await supabase
      .from('sahalar')
      .select('id, saha_adi, telefon, il, ilce, created_at')
      .eq('durum', 'beklemede')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('bekleyen sahalar query error:', error);
      setHata('Bekleyen saha listesi alinamadi.');
      return;
    }

    setBekleyenSahalar((data ?? []) as SahaBasvuru[]);
  }, []);

  useEffect(() => {
    let mounted = true;

    const adminKontrol = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tip, ad')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.log('profiles query error:', profileError);
        router.replace('/');
        return;
      }

      if (!profile || profile.tip !== 'admin') {
        router.replace('/');
        return;
      }

      if (!mounted) return;
      setAdminAd(profile.ad || user.email || 'Admin');
      await bekleyenSahalariGetir();
      if (mounted) setYukleniyor(false);
    };

    adminKontrol();

    return () => {
      mounted = false;
    };
  }, [bekleyenSahalariGetir, router]);

  const durumGuncelle = async (sahaId: string, yeniDurum: 'aktif' | 'reddedildi') => {
    setHata('');
    setIslemdeSahaId(sahaId);

    const { error } = await supabase.from('sahalar').update({ durum: yeniDurum }).eq('id', sahaId);

    if (error) {
      console.log('saha durum update error:', error);
      setHata('Saha durumu guncellenemedi.');
      setIslemdeSahaId(null);
      return;
    }

    await bekleyenSahalariGetir();
    setIslemdeSahaId(null);
  };

  if (yukleniyor) {
    return (
      <div className="mx-auto mt-24 max-w-4xl px-4 text-center">
        <p className="text-sm text-gray-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Admin Onay Paneli</h1>
          <p className="mt-1 text-xs text-gray-500">{adminAd}</p>
        </div>
        <Link href="/" className="text-sm font-semibold text-green-600 hover:underline">
          Ana sayfaya don
        </Link>
      </div>

      {hata && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{hata}</p>}

      {bekleyenSahalar.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
          Beklemede saha basvurusu yok.
        </div>
      ) : (
        <div className="space-y-3">
          {bekleyenSahalar.map((saha) => (
            <div key={saha.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3">
                <h2 className="text-base font-bold">{saha.saha_adi}</h2>
                <p className="text-sm text-gray-600">{saha.telefon}</p>
                <p className="text-sm text-gray-500">
                  {[saha.il, saha.ilce].filter(Boolean).join(' / ') || 'Konum belirtilmedi'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => durumGuncelle(saha.id, 'aktif')}
                  disabled={islemdeSahaId === saha.id}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Onayla
                </button>
                <button
                  type="button"
                  onClick={() => durumGuncelle(saha.id, 'reddedildi')}
                  disabled={islemdeSahaId === saha.id}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reddet
                </button>
                <Link
                  href={`/saha/${saha.id}`}
                  target="_blank"
                  className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  Incele
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
