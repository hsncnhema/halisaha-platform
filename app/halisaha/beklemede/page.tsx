export default function BeklemePage() {
  return (
    <div className="max-w-md mx-auto px-4 pt-24 pb-16 text-center">
      <div className="text-5xl mb-5">🕐</div>
      <h1 className="text-2xl font-extrabold mb-3">Başvurunuz Alındı</h1>
      <p className="text-sm text-gray-400 leading-relaxed mb-6">
        Kaydınız inceleniyor. Admin onayından sonra panelinize erişebileceksiniz.
        En kısa sürede size dönüş yapacağız.
      </p>
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold">
        ✅ Bilgileriniz başarıyla kaydedildi.
      </div>
    </div>
  );
}
