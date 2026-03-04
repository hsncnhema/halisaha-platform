'use client';

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState, use } from 'react';

type IlanDetayData = {
  id: string;
  kategori: string;
  ilce: string;
  baslik: string;
  aciklama: string;
  tarih: string | null;
  saat: string | null;
  format?: string | null;
  profiles?: { ad: string } | null;
};

export default function IlanDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ilan, setIlan] = useState<IlanDetayData | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const getir = async () => {
      const { data } = await supabase
        .from('ilanlar')
        .select('*, profiles(ad)')
        .eq('id', id)
        .single();
      setIlan(data as IlanDetayData | null);
      setYukleniyor(false);
    };
    getir();
  }, [id]);

  if (yukleniyor) {
    return (
      <div className="min-h-screen bg-green-950 flex items-center justify-center">
        <p className="text-sm text-white/40">Yükleniyor...</p>
      </div>
    );
  }

  if (!ilan) {
    return (
      <div className="min-h-screen bg-green-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">İlan bulunamadı.</p>
          <Link href="/ilanlar" className="text-green-400 hover:underline">
            ← İlanlara dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/ilanlar"
          className="mb-6 inline-block text-sm text-white/50 hover:text-green-400"
        >
          ← İlanlara dön
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-green-900/60 px-3 py-1 text-xs font-bold text-green-300">
              {ilan.kategori}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
              📍 {ilan.ilce}
            </span>
          </div>

          <h1 className="mb-3 text-2xl font-black text-white">{ilan.baslik}</h1>

          {ilan.aciklama && (
            <p className="mb-4 text-white/60 leading-relaxed">{ilan.aciklama}</p>
          )}

          {ilan.tarih && (
            <p className="mb-4 text-sm font-semibold text-green-400">
              🗓 {ilan.tarih} {ilan.saat}
            </p>
          )}

          {ilan.format && (
            <p className="mb-4 text-sm text-white/50">⚽ Format: {ilan.format}</p>
          )}

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-4 text-sm text-white/40">
              Paylaşan: {ilan.profiles?.ad || 'Anonim'}
            </p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Sahagram'da "${ilan.baslik}" ilanınızı gördüm, iletişime geçmek istedim.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-500"
            >
              WhatsApp ile İletişim
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
