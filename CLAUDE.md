# CLAUDE.md — HalıSaha Platform

Proje kökü: `C:\Users\Win11\Desktop\halisaha-platform`

---

## Proje Özeti

**HalıSaha Platform**, İstanbul'daki halı saha tesislerini futbolcularla buluşturan bir web uygulamasıdır.
Saha sahipleri tesislerini kayıt edip müsaitlik takvimini yönetebilir; futbolcular sahalar arasında filtreleyip WhatsApp üzerinden rezervasyon yapabilir. Platform oyuncu ilanları ve turnuva desteği sunar.

---

## Teknoloji Yığını

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Dil | TypeScript + JavaScript | TS 5.x |
| Stil | Tailwind CSS | 3.x |
| Backend/DB | Supabase (Auth + PostgreSQL) | 2.98.0 |
| Auth Helpers | @supabase/auth-helpers-nextjs | 0.15.0 |
| Harita | @vis.gl/react-google-maps | 1.7.1 |
| Paket Yöneticisi | npm | — |

> Firebase tamamen kaldırıldı. Tüm sayfalar Supabase'e taşındı.

---

## Proje Yapısı

```
halisaha-platform/
├── app/                             # Next.js App Router
│   ├── page.tsx                     # Ana sayfa
│   ├── layout.tsx                   # Kök layout
│   ├── globals.css                  # Global stiller
│   ├── login/page.tsx               # Giriş sayfası
│   ├── kayit/page.tsx               # Futbolcu kayıt
│   ├── kayit/halisaha/page.js       # Saha sahibi kayıt
│   ├── profil/page.tsx              # Kullanıcı profili
│   ├── profil-tamamla/page.tsx      # Profil tamamlama formu
│   ├── sahalar/page.tsx             # Saha listeleme
│   ├── saha/[id]/page.tsx           # Saha detay sayfası
│   ├── harita/page.tsx              # Google Harita görünümü
│   ├── ilanlar/page.tsx             # İlan panosu (realtime)
│   ├── halisaha/panel/page.tsx      # Saha sahibi yönetim paneli
│   ├── halisaha/beklemede/page.tsx  # Onay bekleme sayfası
│   ├── admin/page.js                # Admin paneli
│   └── auth/callback/route.ts       # OAuth callback handler
├── lib/
│   └── supabase.ts                  # Supabase client & helper fonksiyonlar
├── middleware.ts                    # Auth middleware (session yönetimi)
├── supabase/
│   └── migrations/
│       ├── 001_initial.sql          # DB şeması & RLS politikaları
│       └── ...                      # Ek migration dosyaları
├── public/                          # Statik dosyalar
├── .env.local                       # Ortam değişkenleri (commit edilmez)
├── next.config.ts
├── tailwind.config.js
├── tsconfig.json
├── PRD.md                           # Ürün gereksinimleri dokümanı
└── CLAUDE.md                        # Bu dosya
```

---

## Sayfaların Durumu

| Sayfa | Route | Durum | Notlar |
|-------|-------|-------|--------|
| Ana Sayfa | `/` | Tamamlandı | Hero, mini harita, sahalar bölümü, son ilanlar, özellik kartları |
| Giriş | `/login` | Tamamlandı | Google OAuth + Email/Şifre |
| Futbolcu Kayıt | `/kayit` | Tamamlandı | Google OAuth + Email; `profiles` + `futbolcular` tablosuna yazar |
| Saha Kayıt | `/kayit/halisaha` | Tamamlandı | Email kayıt; `profiles` + `sahalar` tablosuna `beklemede` durumunda yazar |
| Profil Tamamlama | `/profil-tamamla` | Tamamlandı | Mevki, seviye, ilçe, yaş aralığı, bio |
| Profil | `/profil` | Tamamlandı | Görüntüle/düzenle, çıkış yapma |
| Sahalar | `/sahalar` | Tamamlandı | İlçe/format/arama filtresi, müsait slot gösterimi |
| Saha Detay | `/saha/[id]` | Tamamlandı | Bilgi kartları, 7 günlük takvim, WhatsApp butonu |
| Harita | `/harita` | Tamamlandı | Tam ekran harita, marker'lar, format filtresi |
| İlanlar | `/ilanlar` | Tamamlandı | İlan oluşturma (24 saat otomatik silme), realtime channel |
| Saha Paneli | `/halisaha/panel` | Tamamlandı | Kurulum sihirbazı, takvim yönetimi, profil düzenleme |
| Onay Bekleme | `/halisaha/beklemede` | Tamamlandı | Statik bilgilendirme sayfası |
| Admin | `/admin` | Tamamlandı | Saha onaylama, ilan yönetimi, istatistikler, manuel saha ekleme |
| Auth Callback | `/auth/callback` | Tamamlandı | Google OAuth code → session exchange |


---

## Veritabanı Şeması (Supabase PostgreSQL)

### `profiles`
```sql
id         uuid PK → auth.users(id) ON DELETE CASCADE
ad         text
tip        text NOT NULL DEFAULT 'futbolcu'  -- futbolcu | saha | admin
avatar_url text
created_at timestamptz
```

### `futbolcular`
```sql
user_id            uuid PK → profiles(id)
mevki              text     -- Kaleci | Defans | Orta Saha | Forvet
seviye             text     -- Casual | Orta | İyi | Profesyonel
baskin_ayak        text     -- Sağ | Sol | Her İkisi
ilce               text
il                 text
yas_araligi        text     -- 18-25 | 25-35 | 35+
bio                text     -- max ~160 karakter
profil_tamamlandi  boolean DEFAULT false
created_at, updated_at timestamptz
```

### `sahalar`
```sql
id             uuid PK DEFAULT gen_random_uuid()
user_id        uuid UNIQUE → profiles(id)
saha_adi       text NOT NULL
telefon        text NOT NULL
il, ilce       text
lat, lng       double precision
format         text     -- 5v5 | 6v6 | 7v7 | 8v8
fiyat          integer
slot_suresi    integer  -- 60 | 90 dakika
acilis_saati   text     -- HH:MM
kapanis_saati  text     -- HH:MM
durum          text DEFAULT 'beklemede'  -- beklemede | aktif | pasif | reddedildi
kurallar       text
created_at, updated_at timestamptz
```

### `musaitlik`
```sql
id        bigserial PK
saha_id   uuid NOT NULL → sahalar(id)
tarih     date NOT NULL
slot      text NOT NULL   -- HH:MM-HH:MM
durum     text DEFAULT 'bos'  -- bos | dolu
UNIQUE(saha_id, tarih, slot)
created_at, updated_at timestamptz
```

### `ilanlar`
```sql
id              uuid PK DEFAULT gen_random_uuid()
user_id         uuid NOT NULL → profiles(id)
kategori        text NOT NULL  -- Oyuncu Arıyorum | Takım Arıyorum | Duyuru
ilce, il        text
baslik          text NOT NULL
aciklama        text NOT NULL
tarih           date           -- opsiyonel
saat            text           -- opsiyonel
silinme_zamani  timestamptz    -- olusturulma + 24 saat
olusturulma     timestamptz
```

### `turnuvalar` (henüz sayfalarda kullanılmıyor)
```sql
id              uuid PK
saha_id         uuid → sahalar(id)
baslik          text NOT NULL
format          text
tarih           date NOT NULL
katilim_ucreti  integer
max_takim       integer
durum           text
odul            text
olusturulma     timestamptz
```

### `turnuva_katilimlar` (henüz sayfalarda kullanılmıyor)
```sql
id          uuid PK
turnuva_id  uuid → turnuvalar(id)
takim_adi   text NOT NULL
kaptan_id   uuid → profiles(id)
UNIQUE(turnuva_id, takim_adi)
olusturulma timestamptz
```

**RLS:** Tüm tablolarda Row-Level Security aktif. `is_admin(uuid)` fonksiyonu ile admin bypass.

### Saha Onay Akışı
```
Kayıt → beklemede → (Admin onayı) → aktif
                  → (Admin reddi)  → reddedildi
                  → (Deaktif)      → pasif
```
Admin panelinden sahalar onaylanır/reddedilir. Durum değişiklikleri RLS politikalarıyla korunur.

---

## Kimlik Doğrulama & Yönlendirme Akışı

### Auth Yöntemleri
- **Email/Şifre:** `supabase.auth.signUp()` / `signInWithPassword()`
- **Google OAuth:** `supabase.auth.signInWithOAuth({ provider: 'google' })` → `/auth/callback`

### Yönlendirme Mantığı (`kullaniciyiYonlendir` & `yonlendirmeYoluGetir`)
1. `profiles.tip === 'admin'` → `/admin`
2. `profiles.tip === 'futbolcu'` → `/profil` (veya `/profil-tamamla` eğer eksikse)
3. `profiles.tip === 'saha'` → `/halisaha/panel` (veya `/halisaha/beklemede`)
4. Profil yoksa → `profiles` + `futbolcular` oluştur → `/profil-tamamla`

### OAuth Callback Akışı (`/auth/callback/route.ts`)
1. `exchangeCodeForSession(code)` ile session alınır
2. Yeni kullanıcıysa `profiles` + `futbolcular` kaydı oluşturulur
3. Mevcut kullanıcıysa `yonlendirmeYoluGetir()` ile yönlendirilir

### Middleware (`middleware.ts`)
- Her istekte Supabase session doğrulaması
- Cookie yönetimi ve otomatik token yenileme

---

## Supabase Client (`lib/supabase.ts`)

### Dışa aktarılan istemciler
- `supabase` — İstemci tarafı (browser) Supabase client
- `createServerSupabaseClient()` — Sunucu aksiyonları için
- `createRouteSupabaseClient()` — Route handler'lar için

### Yardımcı fonksiyonlar
| Fonksiyon | Açıklama |
|-----------|----------|
| `getSahalar()` | Aktif sahaları `musaitlik` join ile getirir |
| `getSahaById(id)` | Tek saha detayı + müsaitlik takvimi |
| `getIlanlar(limit)` | Süresi dolmamış ilanları getirir |
| `kullaniciyiYonlendir(user)` | Giriş sonrası yönlendirme |
| `yonlendirmeYoluGetir(client, userId)` | Profil tipine göre yol belirler |
| `varsayilanFutbolcuKaydiOlustur(user)` | Yeni kullanıcı için varsayılan kayıt |

### Veri Dönüşümü
- DB'de snake_case (`saha_adi`, `slot_suresi`) → Frontend'de camelCase (`sahaAdi`, `slotSuresi`)
- Helper fonksiyonlar her iki formatı da döndürür

---

## Ortam Değişkenleri

`.env.local` dosyasında bulunması gereken değişkenler:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

> Eski Firebase değişkenleri `.env.local`'de hala mevcut ama kodda kullanılmıyor. Temizlenebilir.

---

## Geliştirme Komutları

```bash
npm run dev      # Geliştirme sunucusu (localhost:3000)
npm run build    # Prodüksiyon build
npm run start    # Prodüksiyon sunucusu
npm run lint     # ESLint kontrolü
```

---

## Önemli Desenler ve Kurallar

### Kodlama Dili
- Değişken ve fonksiyon adları **Türkçe**: `sahaAdi`, `ilce`, `cikisYap`, `verileriGetir`
- DB sütunları **snake_case Türkçe**: `saha_adi`, `profil_tamamlandi`
- UI metinleri tamamen **Türkçe**
- `.tsx` ve `.js` dosyaları bir arada; yeni dosyalar `.tsx` olmalı

### Bileşen Yapısı
- Ayrı bir `/components` klasörü yok; tüm bileşenler sayfa dosyalarının içinde
- Tailwind CSS ile stil; tüm sayfalar Tailwind'e geçirildi (inline style kalmadı)
- Supabase realtime channel kullanımı `ilanlar` sayfasında aktif

### Zaman Yönetimi
- Saat formatı: `HH:MM` (24 saat)
- Gece yarısı geçişi destekleniyor (22:00–02:00)
- Müsaitlik: `musaitlik` tablosunda `tarih` (date) + `slot` (HH:MM-HH:MM) ayrı sütunlar
- 7 günlük ileri takvim

### Koordinat Sistemi
- 39 İstanbul ilçesi için sabit merkez koordinatları (`ILCE_KOORDINATLARI`)
- Sahalar için GPS girilmediyse ilçe merkezi kullanılıyor
- İstanbul merkezi: `41.0082, 28.9784`

---

## Güvenlik

- Tüm tablolarda **RLS (Row-Level Security)** aktif
- Admin kontrolü `is_admin()` PostgreSQL fonksiyonu ile
- `profiles.tip` alanı üzerinden rol bazlı erişim: `futbolcu`, `saha`, `admin`
- Supabase Auth email/şifre + Google OAuth yönetiyor
- Middleware her istekte session doğrulaması yapıyor
- Anon key istemcide açık — RLS politikaları ile korunuyor

---

## Tamamlanan Özellikler

- [x] Supabase migration (Firebase tamamen kaldırıldı)
- [x] Tüm sayfalar Tailwind CSS'e geçirildi
- [x] Admin onay sistemi (saha onay/red/deaktif akışı)
- [x] Saha kayıt akışı Supabase'e taşındı (`beklemede → aktif | reddedildi`)
- [x] Google OAuth yönlendirme sorunu düzeltildi

## TODO - Öncelik Sırası

### Kritik
- [ ] Profil oluşturma akışını tamamla
- [ ] Takım oluşturma sistemi
- [ ] Arkadaş ekleme / takipçi sistemi
- [ ] Arkadaşları takıma davet etme
- [ ] Mesajlaşma sistemi

### Önemli
- [ ] Türkiye geneli tüm iller/ilçeler eklenmeli
- [ ] Site içeriği Türkiye geneline göre düzenlenmeli
- [ ] Saha kayıt formuna ilçe bazlı koordinat atama
- [ ] Halısaha panel detaylandırma
- [ ] Admin paneli genişletme

### Tasarım
- [ ] Ana sayfa UI/UX yenileme
- [ ] Renk kombinasyonu ve görsel deneyim
- [ ] Marka kimliği ve isim kararı
- [ ] Mobil responsive iyileştirme
