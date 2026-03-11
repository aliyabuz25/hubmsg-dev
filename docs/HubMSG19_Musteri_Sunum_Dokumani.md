# HubMSG19 Kurumsal Ürün Dökümantasyonu

**Sürüm:** 1.0  \
**Doküman Tarihi:** 27.02.2026  \
**Hedef Kitle:** Kurumsal müşteriler, operasyon ekipleri, entegrasyon ekipleri

---

## 1. Yönetici Özeti

HubMSG19; çoklu kiracı (multi-tenant) mimaride çalışan, WhatsApp tabanlı kurumsal mesaj gönderimi, cihaz yönetimi, kuyruklama, risk azaltma, detaylı izleme ve API entegrasyonu sağlayan uçtan uca bir platformdur.

Temel değer önerisi:
- Yüksek gönderim sürekliliği için akıllı kuyruk ve cihaz sağlığı yönetimi
- Numara/cihaz blok riskini azaltan adaptif hız limitleme ve AI Guard
- Bayi ve müşteri bazlı yetkilendirme ile çok kiracılı operasyon
- Yönetim panelinde detaylı log, filtreleme, export ve yedekleme yetenekleri

## 2. Mimari ve Altyapı

### 2.1 Bileşenler
- `runner.js`: Çoklu instance orkestrasyonu, tenant bazlı izolasyon, otomatik yeniden başlatma, health-check
- `gateway.js`: `x-tenant-id` header/cookie ile doğru tenant instance yönlendirme (reverse proxy)
- `server.js`: API, web panel, kuyruk motoru, mesaj dağıtımı, güvenlik ve loglama
- `public/admin.html` + `public/js/admin.js`: Yönetim paneli (admin/dealer/user)

### 2.2 Multi-Tenant Çalışma Modeli
- Master instance + tenant bazlı izole instance modeli
- Tenant başına ayrı veri dizini desteği
- Proxy map ile dinamik tenant-port eşlemesi
- Tenant instance sağlık kontrolü ve otomatik restart

## 3. Panel ve Operasyon Özellikleri

### 3.1 Yönetim Paneli Modülleri
- Cihaz Listesi
- Cihaz Ekle
- Toplu Mesaj
- Güvenlik
- İstatistikler
- Mesaj Logları
- Mesaj Şablonları
- Dökümantasyon
- Yedekleme
- Bayi Yönetimi
- Hızlı Aktivasyon
- Giriş & Aktivite

### 3.2 Cihaz ve Oturum Yönetimi
- WhatsApp cihaz eşleme/ekleme/silme, oturum yenileme ve yeniden başlatma
- Cihaz başına sağlık skoru: hata oranı, ardışık hata, son hata zamanı
- Suspended (geçici pasif) cihaz yönetimi ve sağlık aksiyonları
- Cihaz limiti ve kullanıcıya cihaz atama/dağıtım yönetimi

### 3.3 Toplu Mesaj ve Kuyruk Motoru
- Tekil ve toplu alıcı girişi, şablon destekli içerik gönderimi
- Kuyruk durumları: `queued`, `iletliyor`, `iletildi`, `hata`
- Kuyruk önizleme, durum toplamları ve hızlı temizleme
- Mesaj gönderiminde cihaz kilidi (lock) ve yarış koşulu azaltma
- Otomatik geciktirme, jitter, adaptif hız ayarlama

## 4. Bloke Risk Azaltma ve AI Guard

HubMSG19, blok riskini azaltmak için çok katmanlı koruma uygular:
- **Recipient policy/cooldown:** Aynı alıcıya kısa sürede tekrar yüklenmeyi engeller
- **Owner-level queue pause:** Bir kullanıcıda anomali varsa sadece ilgili kullanıcının kuyruğunu geçici durdurur
- **Device health-based throttling:** Sorunlu cihazın hız/limit değerleri dinamik düşürülür
- **AI Guard risk skoru:** İçerik tekrarı, link yoğunluğu, büyük harf oranı, son hata oranı ve blok paterni ile risk hesaplar
- **Deferred sending:** Risk yüksekse mesajı reddetmek yerine kontrollü olarak erteler

AI Guard değerlendirme sinyalleri:
- Son gönderimlerde hata/blok oranı
- Tekrarlayan içerik fingerprint analizi
- Mesaj yapısı (link, uzunluk, uppercase yoğunluğu)
- Cihaz sağlık durumu (suspended/error rate/consecutive failure)

## 5. Gözlemlenebilirlik ve Loglama

### 5.1 Operasyonel metrikler
- 24 saat / özelleştirilebilir saat penceresinde: toplam dispatch, başarı, hata, blok, başarı oranı
- Riskli cihaz listesi: suspended, hata oranı, ardışık hata, son hata
- Benzersiz alıcı sayısı ve sistem yoğunluk göstergeleri

### 5.2 Detaylı loglar (Admin)
- Giriş logları, aktivite logları, tam detaylı sistem logları
- Çoklu filtre: kaynak, seviye, owner, tarih aralığı, arama
- Limit, kritik kayıt filtresi, otomatik yenileme
- JSON/CSV dışa aktarma

### 5.3 Bloke numara görünürlüğü
- `hata` durumlarındaki blok ilişkili hata metinlerinden otomatik tespit
- Alıcı bazında son blok zamanı, blok sayısı, son hata, ilgili cihaz/node görünümü
- Admin için global görünüm, müşteri kullanıcıları için owner bazlı filtreli görünüm

## 6. Güvenlik ve Yetkilendirme

- Rol bazlı yetki modeli (`admin`, bayi/dealer, kullanıcı)
- Session tabanlı kimlik doğrulama + API key kimlik doğrulama
- Güvenilir cihaz yönetimi ve cihaz revoke işlemleri
- Profil, parola ve iletişim bilgisi yönetimi
- Kritik yönetim uçlarında admin/session-admin kontrolü

## 7. Yedekleme ve Felaket Kurtarma

- Yönetim panelinden manuel yedek alma
- Yedek listeleme, içerik görüntüleme, indirme, silme
- Tek tık restore akışı
- Başlangıç ve kapanışta dayanıklılık/log süreçleri

## 8. API ve Entegrasyon Kabiliyeti

Temel dış entegrasyon mesaj uçları:
- `POST /api/message` (API key ile dış sistemlerden gönderim)
- `POST /admin/message` (panel üzerinden gönderim)

API başlıkları:
- `Content-Type: application/json`
- `x-api-key: <MUSTERI_API_KEY>`

Kullanım alanları:
- CRM, ERP, e-ticaret ve çağrı merkezi sistemleri
- OTP/2FA bildirimleri
- Kampanya, duyuru, tahsilat ve operasyon mesajları

## 9. Uluslararasılaşma ve Kullanılabilirlik

- Çok dilli panel altyapısı: Türkçe, Azerice, İngilizce, Rusça
- Mobil erişim ve mobil bildirim feed uçları
- Kullanıcı bazlı veri izolasyonu ve sadeleştirilmiş görünüm

## 10. Rekabet Avantajları

- Çok kiracılı izolasyon + gateway routing kombinasyonu
- Anti-ban odaklı gönderim motoru (policy + health + AI guard)
- Admin panelde ileri seviye detay log ve export kabiliyeti
- Operasyonel metrik + riskli cihaz görünümü ile proaktif yönetim
- Yedekleme/restore ile işletme sürekliliği

## 11. Teknik Uç Nokta Kataloğu (Özet)

| Method | Path | Erişim |
|---|---|---|
| GET | `/admin/login-logs` | Admin |
| GET | `/admin/detailed-logs` | Authenticated + Session Admin |
| GET | `/admin/templates` | Public |
| POST | `/admin/templates` | Public |
| DELETE | `/admin/templates/:id` | Public |
| GET | `/admin/clients` | Authenticated |
| POST | `/admin/clients` | Authenticated |
| POST | `/admin/clients/:id/refresh` | Authenticated |
| DELETE | `/admin/clients/:id` | Authenticated |
| GET | `/admin/devices` | Authenticated |
| DELETE | `/admin/devices/:id` | Authenticated |
| GET | `/admin/queue` | Authenticated |
| GET | `/admin/ops-metrics` | Authenticated |
| GET | `/mobile/notifications/feed` | Authenticated |
| GET | `/api/mobile/notifications` | Public |
| GET | `/admin/mobile/announcements` | Authenticated + Session Admin |
| POST | `/admin/mobile/announcements` | Authenticated + Session Admin |
| GET | `/admin/blocked-numbers` | Authenticated |
| POST | `/admin/devices/:id/health-action` | Authenticated + Session Admin |
| GET | `/admin/message-logs` | Authenticated |
| POST | `/admin/queue/clear` | Authenticated + Session Admin |
| GET | `/admin/config` | Authenticated |
| GET | `/` | Public |
| GET | `/admin` | Authenticated |
| GET | `/mobile/login` | Public |
| GET | `/mobile/register` | Public |
| POST | `/mobile/register` | Public |
| POST | `/mobile/login` | Public |
| POST | `/mobile/verify-otp` | Public |
| GET | `/mobile/logout` | Public |
| GET | `/mobile` | Authenticated |
| POST | `/admin/message` | Authenticated |
| GET | `/admin/recipients/2fa` | Authenticated |
| POST | `/admin/tickets` | Authenticated |
| GET | `/admin/profile` | Authenticated |
| POST | `/admin/profile` | Authenticated |
| POST | `/admin/tickets/:id/reply` | Authenticated |
| GET | `/login` | Public |
| POST | `/login` | Public |
| GET | `/otp` | Public |
| POST | `/verify-otp` | Public |
| GET | `/logout` | Public |
| POST | `/admin/users` | Admin |
| GET | `/admin/dealers` | Admin |
| POST | `/admin/dealers` | Admin |
| PUT | `/admin/dealers/:username` | Admin |
| POST | `/admin/devices/:id/assign` | Admin |
| POST | `/api/message` | Public |
| GET | `/admin/backups` | Admin |
| POST | `/admin/backups` | Admin |
| DELETE | `/admin/backups/:date/:time` | Admin |
| GET | `/admin/backups/:date/:time/file/:filename` | Admin |
| POST | `/admin/backups/restore` | Admin |
| POST | `/admin/security/revoke-device` | Authenticated |
| GET | `/health` | Public |

## 12. Sonuç

HubMSG19; büyümeye uygun multi-tenant mimarisi, yüksek operasyonel görünürlük, gelişmiş güvenlik kontrolleri ve blok riskini azaltmaya odaklı akıllı dağıtım motoru ile kurumsal mesaj operasyonlarını tek platformda birleştirir.