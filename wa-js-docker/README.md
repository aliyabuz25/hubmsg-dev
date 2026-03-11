# hubmsg-v2-prod

Bu klasor Portainer ve Traefik uzerinden calisacak `hubmsg-v2-prod` deployment paketi icindir.

## Preflight
- Bu local workspace bir git deposu degil.
- `/datastore` bu makinede su an mevcut degil; bu yuzden host dizinlerini burada olusturmadim.
- Docker network kontrolunde `edge` networku mevcut gorundu.
- Docker container listesi bu ortamda bos dondu; Traefik/Portainer container'larini burada teyit edemedim.

## Sabitler
- Traefik entrypoint: `web`
- Traefik hedefi: `127.0.0.1:8080`
- Docker network: `edge`
- Domain: `msg.octotech.az`
- phpMyAdmin yolu: `msg.octotech.az/pma`
- Host port acma: yok

## Dizin Yapisi
Host tarafinda beklenen yapi:

```text
/datastore/hubmsg-v2-prod/
  hubmsg-v2-prod.zip
  app/
  datalar/
  uploads/
  nginx-logs/
  tenant_data/
  backups/
```

Not:
- Bu uygulama tek servisli Node runtime'dir; frontend/backend ayrik degil.
- Mobil template bilincli olarak eklenmedi.
- Admin panel `public/admin.html` fallback'i ile calisir.
- Yapisal veri JSON dosyalar yerine MySQL `app_state` ve `auth_state` tablolarinda tutulur.
- Baileys auth/session datasi da MySQL'e yazilir.

## ZIP Paketleme
`wa-js-docker` klasorunu zipleyip su hedefe koy:

```sh
mkdir -p /datastore/hubmsg-v2-prod
cd /Users/ali_new/Desktop/HubMSG19/wa-js
zip -r /datastore/hubmsg-v2-prod/hubmsg-v2-prod.zip wa-js-docker -x '*/.DS_Store' '*/__MACOSX/*' '*/._*'
```

Acma hedefi:

```sh
mkdir -p /datastore/hubmsg-v2-prod/app
unzip /datastore/hubmsg-v2-prod/hubmsg-v2-prod.zip -d /datastore/hubmsg-v2-prod/app
```

Zip acildiginda dosyalar `/datastore/hubmsg-v2-prod/app/wa-js-docker/...` altina duser. Genelde deploy oncesi icerigi bir seviye yukari alin:

```sh
mv /datastore/hubmsg-v2-prod/app/wa-js-docker/* /datastore/hubmsg-v2-prod/app/
rmdir /datastore/hubmsg-v2-prod/app/wa-js-docker
```

## Build
Bu stack default olarak image'i repo icinden build eder.
Portainer build context sorunu olursa image'i hostta build et:

```sh
docker build -t hubmsg-v2-prod:latest -f /datastore/hubmsg-v2-prod/app/Dockerfile /datastore/hubmsg-v2-prod/app
```

## Portainer Stack
Hazir stack dosyasi:
- `portainer-stack.yml`

Portainer web editor ile deploy akisi:

```sh
1. `portainer-stack.yml` icerigini Stack editor'e yapistir
2. Stack environment variables bolumunu ac
3. `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `PMA_PASSWORD`, `SESSION_SECRET` degerlerini ekle
4. `PMA_PASSWORD` degerini `MYSQL_PASSWORD` ile ayni yap
```

`portainer-stack.yml` placeholder degerlerle parse olur; production deploy oncesi bu degerleri gercek secret'larla override et.

Ozellikler:
- host port yok
- `edge` external network
- Traefik label ile `msg.octotech.az`
- Ayni host altinda `/pma` ile phpMyAdmin
- service ici port `2004`
- MySQL user: `hub@dev`
- Portainer env anahtarlari: `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `PMA_PASSWORD`, `SESSION_SECRET`
- `PMA_PASSWORD`, `MYSQL_PASSWORD` ile ayni olmali
- Uygulama servisi `Dockerfile` uzerinden otomatik build edilir

Deploy:

```sh
mkdir -p /datastore/hubmsg-v2-prod/datalar
mkdir -p /datastore/hubmsg-v2-prod/tenant_data
mkdir -p /datastore/hubmsg-v2-prod/uploads
mkdir -p /datastore/hubmsg-v2-prod/nginx-logs
mkdir -p /datastore/hubmsg-v2-prod/backups
mkdir -p /datastore/hubmsg-v2-prod/mysql
```

Portainer Stack icerigi icin `portainer-stack.yml` kullan.

## Cloudflared
Cloudflare Tunnel Public Hostname:

```text
msg.octotech.az -> http://127.0.0.1:8080
```

DNS yoksa `ERR_NAME_NOT_RESOLVED` gorursun.

## Test
```sh
curl -H "Host: msg.octotech.az" http://127.0.0.1:8080/
curl -H "Host: msg.octotech.az" http://127.0.0.1:8080/pma/
docker ps | grep hubmsg-v2-prod
docker network ls | grep edge
```

## Notlar
- Uygulama upload URL'lerini aktif olarak uretmiyor; `PUBLIC_BASE_URL` env'i bos birakildi.
- API ve admin ayni container/service icinden servis edilir.
- `uploads/` ve `nginx-logs/` dizinleri deployment standardi icin eklendi.
- `datalar/` klasoru hala PDF benzeri dosya ciktlari icin kullanilir; JSON state burada tutulmaz.
