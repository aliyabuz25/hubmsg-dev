# Müştəri Üçün Tam Sistem Dökümantasiyası (AZ)

**Versiya:** 1.0  
**Sənəd Tarixi:** 27.02.2026  
**Təyinat:** Müştəri təqdimatı, idarəetmə heyəti, əməliyyat və inteqrasiya komandaları

---

## 1. Qısa Baxış

Platforma WhatsApp əsaslı korporativ mesajlaşma platformasıdır. Sistem çoxsaylı müştəriləri (multi-tenant), çoxsaylı cihazları və yüksək həcmli göndərişləri təhlükəsiz, idarəolunan və ölçülə bilən formada idarə etmək üçün qurulub.

Platformanın əsas məqsədi:
- Mesajların stabil və fasiləsiz çatdırılması
- Nömrə/c cihaz blok riskinin minimuma endirilməsi
- Hər müştəri üçün ayrılmış, təhlükəsiz və idarəolunan iş axını
- Admin paneldə tam görünürlük: loglar, statistika, risk siqnalları və audit

## 2. Sistem Hansı Problemləri Həll Edir?

- Tək cihaz üzərinə həddindən artıq yüklənməni aradan qaldırır
- Eyni istifadəçi və ya eyni alıcıya agresiv göndəriş riskini azaldır
- İdarəedici komandaya real vaxt əməliyyat görünürlüğü verir
- Müştəri bazası böyüdükcə sistemin parçalanmadan genişlənməsini təmin edir
- API vasitəsilə CRM/ERP/e-commerce sistemləri ilə sürətli inteqrasiya yaradır

## 3. Memarlıq (Architecture)

### 3.1 Əsas komponentlər

- `runner.js` - Orkestrator: instansların işə salınması, health-check, avto-restart
- `gateway.js` - Yönləndirici: tenant ID əsasında doğru instansa trafik göndərilməsi
- `server.js` - Platformanın nüvəsi: API-lər, panel, növbə mühərriki, təhlükəsizlik, loglama
- `public/admin.html` + `public/js/admin.js` - Web idarəetmə paneli

### 3.2 Multi-tenant iş modeli

- Master instans + tenant-a görə izolə instans strukturu
- Tenant başına ayrıca data qovluğu
- Proxy map ilə dinamik tenant-port xəritəsi
- Hər instans üçün periodik sağlamlıq yoxlaması
- Problemdə avtomatik yenidən işə salma (self-heal davranışı)

Nəticə: Bir müştəridə yaranan problem digər müştərilərin əməliyyatına minimal təsir edir.

## 4. İdarəetmə Paneli Modulları

Paneldə müştərinin gündəlik istifadə etdiyi və adminin nəzarət etdiyi əsas bölmələr:

- Cihaz Siyahısı
- Cihaz Əlavə Et
- Toplu Mesaj
- Təhlükəsizlik
- Statistika
- Mesaj Logları
- Şablonlar
- Dökümantasiya
- Yedəkləmə (admin)
- Bayi İdarəetməsi (admin)
- Sürətli Aktivasiya (admin)
- Giriş və Aktivlik (admin)
- Tam Detallı Loglar (admin)

## 5. Cihaz və Sessiya İdarəetməsi

Platforma WhatsApp sessiyalarını canlı idarə edir:

- Yeni cihaz qoşma (pairing)
- Sessiya statusuna nəzarət (`ready`, `status`, `qr`, `createdAt`)
- Cihaz yeniləmə/restart/silmə
- Cihazın hansı istifadəçiyə aid olduğunun izlənməsi
- Cihaz limitləri və istifadəçiyə cihaz təyinatı

Əlavə olaraq sistem cihaz sağlamlığı üçün aşağıdakı ölçüləri saxlayır:
- `consecutiveFailures` (ardıcıl uğursuzluq)
- `errorRate` (xəta nisbəti)
- `lastError`, `lastErrorAt`
- `dynamicLimit`, `dynamicMinIntervalMs`
- `suspended` və `suspendedReason`

## 6. Mesaj Növbəsi və Göndəriş Mühərriki

### 6.1 Növbə statusları

- `queued` - gözləmədə
- `iletiliyor` - göndərilir
- `iletildi` - uğurla çatdırıldı
- `hata` - xətaya düşdü

### 6.2 İş prinsipi

- Sistem növbədəki mesajları skan edir
- Hər mesaj üçün uyğun və hazır cihaz seçilir
- Cihaz limiti və interval qaydaları tətbiq olunur
- Uyğun deyilsə mesaj avtomatik gecikdirilir (`deferUntil`)
- Uğurlu/ugursuz nəticələr log və metriklərə yazılır

### 6.3 Niyə bu model vacibdir?

Bu model bir nömrənin "yandırılmasının" qarşısını alır, yükü cihazlar arasında balanslayır və əməliyyat stabilliyini artırır.

## 7. Blok Riskindən Qoruma Mexanizmləri

Platforma-də blok riskini azaltmaq üçün bir neçə müdafiə təbəqəsi var.

### 7.1 Recipient policy (alıcı siyasəti)

- Eyni alıcıya qısa müddətdə təkrar yük göndərməni məhdudlaşdırır
- Hədd aşılırsa mesaj rədd edilmir, kontrollu şəkildə ertələnir

### 7.2 Owner-level qoruma

- Hər istifadəçi (owner) üçün ayrıca risk izlənir
- Bir istifadəçidə anomaliya artdıqda yalnız onun növbəsi pause ola bilər
- Digər istifadəçilərin axını davam edir

### 7.3 Device health throttling

- Cihaz riskli davranış göstərdikdə sürət limiti dinamik azaldılır
- Ardıcıl xəta və yüksək error rate-də cihaz müvəqqəti `suspend` edilir

### 7.4 AI Guard (sadə AI əsaslı risk mühərriki)

AI Guard göndərişdən öncə risk skorunu hesablayır:
- Son cəhdlərdə uğursuzluq və blok nisbəti
- Məzmun təkrarını fingerprint ilə aşkarlama
- Link intensivliyi
- Mesajın uzunluğu və böyük hərf sıxlığı
- Cihazın cari sağlamlıq vəziyyəti

Risk yüksəkdirsə:
- Mesaj birbaşa göndərilmir
- Gecikmə ilə növbəyə qaytarılır
- Loglarda səbəb kodları qeyd olunur (`ai_guard:*`)

Bu yanaşma blok riskini praktiki şəkildə aşağı salır və hesabların ömrünü uzadır.

## 8. Bloklanan Nömrələrin İzlənməsi

Sistem blokla əlaqəli xətaları xüsusi markerlərlə analiz edir (məsələn: `blocked`, `banned`, `forbidden`, `unauthorized`, `spam`).

Admin paneldə bloklanan nömrələr cədvəlində göstərilir:
- Owner
- Nömrə
- Blok sayı
- Son blok vaxtı
- Son xəta mətni
- Əlaqəli cihaz/node

Bunun üstünlüyü: hansı nömrəyə hansı səbəbdən risk yığıldığı dərhal görünür və müdaxilə sürətlənir.

## 9. Statistika və Əməliyyat Metrikləri

`/admin/ops-metrics` üzərindən sistem aşağıdakı göstəriciləri verir:
- Seçilən saat pəncərəsində ümumi dispatch sayı
- Uğurlu çatdırılan mesaj sayı
- Xəta sayı
- Blokla əlaqəli xəta sayı
- Uğur faizi (`successRate`)
- Unikal alıcı sayı
- Riskli/suspend cihazların siyahısı

Bu statistika rəhbərliyə KPI izlənməsi, əməliyyat komandasına isə erkən xəbərdarlıq imkanı yaradır.

## 10. Loglama və Audit (Tam Detallı)

Platforma-də loglama bir neçə səviyyədə aparılır:

- Login logları
- Aktivlik logları
- Mesaj dispatch logları
- Tam detallı sistem logları (source/level/owner/date filter)

Admin üçün imkanlar:
- Güclü filtr və axtarış
- Tarix aralığı seçimi
- Kritk qeydləri ayrıca göstərmə
- Auto-refresh
- JSON/CSV export

Bu modul həm audit, həm də problemin kök səbəb analizində əsas alətdir.

## 11. Təhlükəsizlik və Səlahiyyətlər

### 11.1 Giriş və autentifikasiya

- Session əsaslı giriş
- API key əsaslı inteqrasiya girişi
- Trusted device yanaşması
- Cihaz revoke əməliyyatı

### 11.2 Rol bazlı nəzarət

- `admin` - tam səlahiyyət
- `dealer/bayi` - müştəri və cihaz idarəetməsi
- standart istifadəçi - öz resurslarına məhdud çıxış

### 11.3 Praktik təhlükəsizlik üstünlüyü

Kritik endpoint-lər admin və ya session-admin yoxlaması ilə qorunur. Bu, yanlış əməliyyat və daxili riskləri azaldır.

## 12. Yedəkləmə və Bərpa

Admin paneldə yedəkləmə modulu mövcuddur:
- Backup yaratma
- Backup siyahısı və ölçüsü
- Fayl səviyyəsində baxış/yükləmə
- Backup silmə
- Sistem bərpası (restore)

Yedəkləmə modulu biznes davamlılığı üçün kritikdir və data itkisi riskini azaldır.

## 13. API İmkanları və İnteqrasiya

### 13.1 Əsas endpoint

- `POST /api/message`

### 13.2 Header-lər

- `Content-Type: application/json`
- `x-api-key: <MUSTERI_API_KEY>`

### 13.3 Body parametrləri

- `recipient` (string) - mesaj göndəriləcək nömrə
- `message` (string) - mesaj mətni

### 13.4 Cavab məntiqi

- `200` - mesaj növbəyə əlavə edildi
- `400` - parametr xətası
- `401` - API key xətası
- `500` - server və ya aktiv cihaz problemi

### 13.5 İnteqrasiya ssenariləri

- CRM hadisələrindən avtomatik bildiriş
- ERP borc/ödəmə xatırlatmaları
- E-commerce sifariş status mesajları
- OTP/2FA axınları

## 14. Mobil Bildiriş və Dəstək Axınları

Sistem mobil bildiriş feed-ləri və elan mexanizmləri ilə field komandaların məlumatlandırılmasını asanlaşdırır.

- Mobil notification feed endpoint-ləri
- Admin tərəfindən announcement paylaşımı
- İstifadəçi tərəfdə son hadisələrin izlənməsi

## 15. Beynəlxalqlaşma (Localization)

Panel çoxdilli istifadəni dəstəkləyir:
- Azərbaycan dili
- Türk dili
- İngilis dili
- Rus dili

Bu, müxtəlif regionlarda eyni platformanın rahat tətbiqini sürətləndirir.

## 16. Miqyaslanma və Etibarlılıq

Platforma artan yüklərdə aşağıdakı strategiyalarla stabilliyi qoruyur:

- Tenant-a görə ayrılmış instanslar
- Orkestrator ilə avto-restart
- Health endpoint monitorinqi
- Növbə vəziyyətinin periodik təmizlənməsi
- Yükü cihazlar arasında bölüşdürən dispatch seçimi

Nəticə: Sistem kiçik komandadan böyük korporativ əməliyyata keçid üçün uyğundur.

## 17. Rəqabət Üstünlükləri

- Multi-tenant + gateway yönləndirmə
- Anti-block yönümlü ağıllı dispatch və AI Guard
- Admin üçün geniş filtrli tam detallı loglar
- Bloklanan nömrələr üzrə cədvəl əsaslı görünürlük
- Riskli cihazları avtomatik önə çıxaran metrik paneli
- Backup/restore ilə əməliyyat dayanıqlığı

## 18. Texniki Endpoint Kataloqu (Qısa)

| Method | Endpoint | Təyinat |
|---|---|---|
| GET | `/admin/clients` | Cihaz/sessiya siyahısı |
| POST | `/admin/clients` | Yeni cihaz/sessiya yaratma |
| POST | `/admin/clients/:id/refresh` | Sessiya yeniləmə |
| DELETE | `/admin/clients/:id` | Sessiya silmə |
| GET | `/admin/devices` | Cihazlar və health məlumatı |
| POST | `/admin/devices/:id/health-action` | Suspend/resume/reset health əməliyyatı |
| GET | `/admin/queue` | Növbə və status toplamları |
| POST | `/admin/queue/clear` | Növbəni təmizləmə |
| GET | `/admin/message-logs` | Mesaj logları (filterli) |
| GET | `/admin/blocked-numbers` | Bloklanan nömrələr cədvəli |
| GET | `/admin/ops-metrics` | Əməliyyat metrikləri |
| GET | `/admin/detailed-logs` | Tam detallı loglar |
| GET | `/admin/backups` | Backup siyahısı |
| POST | `/admin/backups` | Backup yaratma |
| POST | `/admin/backups/restore` | Backup bərpası |
| POST | `/api/message` | Xarici sistemdən mesaj göndərmə |
| GET | `/health` | Sistem health check |

## 19. Müştəri Üçün İstifadə Tövsiyələri

- Göndərişləri bir cihazda toplamaq əvəzinə cihazlar arasında bölün
- Eyni məzmunu qısa aralıqlarla çox təkrarlamayın
- AI Guard xəbərdarlıqlarını izləyib şablonları periodik yeniləyin
- Bloklanan nömrə cədvəlini gündəlik monitor edin
- Backup siyasətini həftəlik minimum standart kimi tətbiq edin

## 20. Nəticə

Platforma yalnız mesaj göndərən bir panel deyil; risk idarəetməsi, audit, təhlükəsizlik və miqyaslanmanı birləşdirən korporativ əməliyyat platformasıdır.

Müştəri üçün dəyər:
- Daha stabil çatdırılma
- Daha aşağı blok riski
- Daha şəffaf idarəetmə
- Daha sürətli inteqrasiya
- Daha etibarlı biznes davamlılığı
