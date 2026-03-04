import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';

type IlanDetay = {
  id: string;
  user_id: string;
  kategori: string;
  il: string | null;
  ilce: string | null;
  baslik: string;
  aciklama: string;
  tarih: string | null;
  saat: string | null;
  format?: string | null;
  profiles:
    | {
        ad: string | null;
        tip: string | null;
      }
    | Array<{
        ad: string | null;
        tip: string | null;
      }>
    | null;
};

export default async function IlanDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: ilanData, error } = await supabase
    .from('ilanlar')
    .select('*, profiles(ad, tip)')
    .eq('id', id)
    .single();

  if (error || !ilanData) {
    notFound();
  }

  const ilan = ilanData as IlanDetay;
  const profile = Array.isArray(ilan.profiles) ? ilan.profiles[0] : ilan.profiles;
  const paylasanAd = profile?.ad || 'Bilinmeyen Kullanıcı';
  const formatBilgisi = ilan.format || 'Belirtilmedi';
  const whatsappText = encodeURIComponent(
    `Sahagram'da ilanınızı gördüm. ${ilan.baslik} ilanı hakkında bilgi alabilir miyim?`
  );

  return (
    <div className="min-h-screen bg-green-950 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/ilanlar" className="text-sm font-semibold text-green-400 hover:underline">
          ← İlanlara dön
        </Link>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-xs font-bold text-green-300">
              {ilan.kategori}
            </span>
          </div>

          <h1 className="text-2xl font-black text-white">{ilan.baslik}</h1>

          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/70">
            {ilan.aciklama}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-white/40">Tarih</p>
              <p className="text-sm font-semibold text-white">{ilan.tarih || 'Belirtilmedi'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-white/40">Saat</p>
              <p className="text-sm font-semibold text-white">{ilan.saat || 'Belirtilmedi'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-white/40">İlçe</p>
              <p className="text-sm font-semibold text-white">{ilan.ilce || 'Belirtilmedi'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-white/40">İl</p>
              <p className="text-sm font-semibold text-white">{ilan.il || 'Belirtilmedi'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:col-span-2">
              <p className="text-xs text-white/40">Format</p>
              <p className="text-sm font-semibold text-white">{formatBilgisi}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40">Paylaşan kişi</p>
            <p className="mt-1 text-sm font-semibold text-white">{paylasanAd}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-500"
            >
              WhatsApp ile iletişime geç
            </a>
            <Link
              href="/ilanlar"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
            >
              Geri dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
