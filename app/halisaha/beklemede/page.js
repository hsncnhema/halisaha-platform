export default function BeklemePage() {
  return (
    <div style={{ maxWidth: 480, margin: '100px auto', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🕐</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Başvurunuz Alındı</h1>
      <p style={{ color: '#6b7c6b', lineHeight: 1.7, marginBottom: 24 }}>
        Kaydınız inceleniyor. Admin onayından sonra panelinize erişebileceksiniz.
        En kısa sürede size dönüş yapacağız.
      </p>
      <div style={{
        background: '#f0fdf4', border: '1.5px solid #86efac',
        borderRadius: 12, padding: 16, fontSize: 13, color: '#166534'
      }}>
        ✅ Bilgileriniz başarıyla kaydedildi.
      </div>
    </div>
  );
}