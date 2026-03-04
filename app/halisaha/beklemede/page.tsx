import Link from 'next/link';

export default function BeklemePage() {
  return (
    <div className="min-h-screen bg-green-950 mx-auto max-w-md px-4 pb-16 pt-24 text-center">
      <div className="mb-5 text-5xl">🕐</div>
      <h1 className="mb-3 text-2xl font-extrabold text-white">Basvurunuz Alindi</h1>
      <p className="mb-6 text-sm leading-relaxed text-white/40">
        Kaydiniz inceleniyor. Admin onayindan sonra panelinize erisebileceksiniz. En kisa surede size donus yapacagiz.
      </p>
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400">
        Bilgileriniz basariyla kaydedildi.
      </div>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/10"
      >
        Ana sayfaya don
      </Link>
    </div>
  );
}
