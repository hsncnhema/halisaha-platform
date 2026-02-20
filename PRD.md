ECHO is on.
# HalıSaha Platformu — Proje Dokümantasyonu

## Proje Özeti
Türkiye'deki halı sahalar için web platformu. Futbolcular yakınlarındaki sahaları haritada bulur, müsait saatleri görür ve WhatsApp üzerinden rezervasyon yapar. Ayrıca oyuncu/takım arama ilan panosu var.

**Hedef pazar:** Başlangıçta İstanbul, ilerleyen aşamada Türkiye geneli.
**Platform:** Web öncelikli (Next.js), ileride React Native mobil.

---

## Teknik Stack
- **Frontend:** Next.js 14 (App Router), Tailwind CSS (henüz kullanılmıyor, inline style ile gidildi)
- **Backend:** Firebase (Auth, Firestore, Functions)
- **Harita:** Google Maps API (`@vis.gl/react-google-maps` paketi)
- **Deploy:** Vercel (henüz deploy edilmedi)
- **Repo:** GitHub (private)

---

## Kullanıcı Tipleri
1. **Futbolcu** — varsayılan kayıt tipi. Google veya email ile kayıt.
2. **Halı Saha** — admin onayı gerekli. Email ile kayıt, `durum: beklemede → aktif`.
3. **Admin** — `futbolcular` koleksiyonunda `admin: true` alanı olan kullanıcı.

---

## Firestore Koleksiyon Yapısı

### `futbolcular/{uid}`
```
ad, email, mevki, baskinAyak, seviye, ilce, yasAraligi, bio,
profilTamamlandi (bool), admin (bool, opsiyonel), olusturulma
```

### `sahalar/{uid veya docId}`
```
sahaAdi, email, telefon, ilce, format (5v5/6v6/7v7/8v8),
fiyat (number), acilisSaati, kapanisSaati, slotSuresi (60 veya 90 dakika),
kurulumTamamlandi (bool), durum (beklemede/aktif/reddedildi),
musaitlik: { "YYYY-MM-DD_HH:MM-HH:MM": "bos" | "dolu" },
kurallar, olusturulma
NOT: Admin panelinden eklenen sahalar uid yerine rastgele docId alır.
```

### `ilanlar/{ilanId}`
```
uid, acanTip (futbolcu/saha), kategori (Oyuncu Arıyorum/Takım Arıyorum/Duyuru),
ilce, baslik, aciklama, tarih, saat,
silinmeZamani (Timestamp, 24 saat sonra), olusturulma
Kural: Maks 3 aktif ilan/kullanıcı (henüz uygulanmadı)
```

### Gelecek Koleksiyonlar (v2/v3)
- `takimlar/{takimId}` — takım profilleri, kaptan sistemi
- `turnuvalar/{turnuvaId}` — sahalar düzenler, takımlar katılır

---

## Sayfa Yapısı

| Sayfa | Dosya | Açıklama |
|-------|-------|----------|
| Ana Sayfa | `app/page.js` | Hero + harita widget + son ilanlar |
| Giriş | `app/login/page.js` | Google + email/şifre |
| Futbolcu Kayıt | `app/kayit/page.js` | Google + email, `futbolcular` koleksiyonuna yazar |
| Halı Saha Kayıt | `app/kayit/halisaha/page.js` | Email only, `sahalar` koleksiyonuna yazar |
| Profil Tamamla | `app/profil-tamamla/page.js` | Mevki, seviye, ilçe vs. |
| Profil | `app/profil/page.js` | Görüntüle + düzenle + çıkış |
| Saha Listesi | `app/sahalar/page.js` | Aktif sahalar, ilçe+format filtresi |
| Harita | `app/harita/page.js` | Google Maps, tüm sahalar pinli |
| Saha Profili | `app/saha/[id]/page.js` | Saha detayı, müsaitlik, WhatsApp butonu |
| İlan Panosu | `app/ilanlar/page.js` | Listele + ilan aç |
| Halı Saha Paneli | `app/halisaha/panel/page.js` | Takvim yönetimi + profil düzenleme |
| Beklemede | `app/halisaha/beklemede/page.js` | Onay bekleniyor sayfası |
| Admin | `app/admin/page.js` | Başvurular, sahalar, kullanıcılar, ilanlar |

---

## Auth ve Yönlendirme
`lib/auth.js` — `kullaniciyiYonlendir(user, router)` fonksiyonu:
1. `futbolcular` koleksiyonuna bak
   - `admin: true` ise → `/admin`
   - `profilTamamlandi: false` ise → `/profil-tamamla`
   - Normal → `/`
2. `sahalar` koleksiyonuna bak
   - `durum: aktif` → `/halisaha/panel`
   - `durum: beklemede` → `/halisaha/beklemede`
3. Hiçbirinde yoksa → `futbolcular`a otomatik kaydet → `/profil-tamamla`

---

## Slot Sistemi
- Saha panelinde ilk girişte **kurulum ekranı** çıkar (açılış/kapanış saati + slot süresi)
- Slot süresi: 60 dk veya 90 dk
- Gece yarısını geçen sahalar desteklenir (örn: 22:00 - 02:00)
- Slot formatı: `"19:00-20:00"` veya `"19:30-21:00"`
- Firestore'da key: `"YYYY-MM-DD_HH:MM-HH:MM"` → value: `"bos"` | `"dolu"`
- 7 günlük ileriye dönük takvim
- İşletme slota tıklayarak boş/dolu değiştirir (anlık Firestore güncelleme)

---

## WhatsApp Entegrasyonu
- Her boş slot için ayrı "Rezerve Et" butonu
- Önceden doldurulmuş mesaj: saha adı + format + tarih + saat
- `https://wa.me/90{numara}?text={encodedMesaj}` formatı
- UTM parametresi henüz eklenmedi (v2)

---

## Google Maps
- Paket: `@vis.gl/react-google-maps`
- API Key: `.env.local` → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Sahalar koordinatsızsa ilçe koordinatı kullanılıyor (`ILCE_KOORDINATLARI` objesi)
- Gerçek adres → koordinat dönüşümü henüz yapılmadı (v2: Google Geocoding API)
- Ana sayfada küçük widget (320px yükseklik), harita sayfasında tam ekran

---

## Firestore Güvenlik Kuralları
```
futbolcular: okuma herkese açık, yazma kendi uid'i
sahalar: okuma herkese açık, yazma giriş yapmış herkes (admin ekleme için geniş tutuldu)
ilanlar: okuma herkese açık, oluşturma giriş yapmış herkes, güncelleme/silme kendi uid'i
```

---

## Tamamlanan Özellikler
- [x] Next.js + Firebase kurulumu
- [x] Google + Email/Password auth
- [x] Rol bazlı kayıt (futbolcu / halı saha)
- [x] Rol bazlı yönlendirme
- [x] Futbolcu profil sayfası
- [x] Halı saha kayıt + admin onay akışı
- [x] Halı saha paneli (takvim + profil)
- [x] Kurulum ekranı (slot süresi + çalışma saatleri)
- [x] Saha profil sayfası + WhatsApp butonu
- [x] İlan panosu (listeleme + oluşturma)
- [x] Admin paneli (onay + saha ekleme + kullanıcı listesi)
- [x] Saha listesi sayfası (ilçe + format filtresi)
- [x] Google Maps entegrasyonu (harita + ana sayfa widget)

---

## Kalan İşler (MVP için)

### Öncelikli
- [ ] Mobil uyum kontrolü ve düzeltme
- [ ] Vercel deploy + domain
- [ ] Firebase güvenlik kurallarını sıkılaştır (admin kontrolü)
- [ ] Profil tamamlamayı zorunlu hale getir (tamamlanmadan ana sayfaya geçilmesin)
- [ ] Sahalara gerçek koordinat ekleme (Google Geocoding veya manuel)

### Orta Öncelik
- [ ] İlan limiti (maks 3 aktif ilan/kullanıcı)
- [ ] Saha listesinde boş slot sayısı göster
- [ ] Admin panelinde il/ilçe filtresi
- [ ] Halı saha panelinde çalışma saatlerini sonradan değiştirebilme

### v2
- [ ] Online ödeme (İyzico veya Stripe)
- [ ] Check-in sistemi
- [ ] Waitlist (boşalınca haber ver — SMS + email)
- [ ] Takım profili + kaptan sistemi
- [ ] İlan sabitleme (ücretli)
- [ ] UTM parametresi + referral sistemi
- [ ] Google Geocoding ile gerçek adres → koordinat

### v3
- [ ] Turnuva sistemi (sahalar düzenler, takımlar katılır)
- [ ] React Native mobil uygulama

---

## Önemli Kararlar
- `users` koleksiyonu yerine `futbolcular` + `sahalar` ayrı koleksiyonlar kullanıldı
- Halı saha Google ile kayıt olamaz, sadece email/şifre
- Format saha tarafından belirlenir, kullanıcı değiştiremez
- WhatsApp butonu kayıt gerektirmiyor
- Slot süresi 60 veya 90 dk (30 dk da eklenebilir)
- Gece yarısını geçen saha saatleri destekleniyor
- Admin panelinden direkt saha eklenebiliyor (test verisi için)
- Next.js 16'da `params` Promise olarak geliyor → `use(params)` ile unwrap edilmeli

---

## Kurulum
```bash
git clone [repo]
npm install
# .env.local dosyasını oluştur:
# NEXT_PUBLIC_FIREBASE_API_KEY=...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
# NEXT_PUBLIC_FIREBASE_APP_ID=...
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
npm run dev
```