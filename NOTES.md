# Proje Notları

Bu dosya, projeye bir süre ara verdikten (veya yeni bir bilgisayara geçtikten)
sonra hatırlanması gereken şeyleri tutar. Koddan ya da git geçmişinden kolayca
çıkarılamayan bilgiler burada.

## Genel yapı

- **Frontend (bu repo)**: statik "link in bio" tarzı kişisel sayfa, build adımı
  yok — düz HTML/CSS/JS. GitHub Pages'e deploy oluyor.
- **Backend** (`kisisel-sayfam-backend`, ayrı ve private repo): FastAPI.
  Etkinlik başına fotoğraf yükleme + moderasyonlu galeri için var — davetliler
  bir linkten fotoğraf yüklüyor, fotoğraflar onaylanmadan herkese görünmüyor.
  Altyapı/hesap detayları o reponun `NOTES.md` dosyasında.

### Canlı adresler

| Ne | Adres |
|---|---|
| Site | https://omerkartlimarmara.github.io/kisisel-sayfam/ |
| Admin paneli | https://omerkartlimarmara.github.io/kisisel-sayfam/admin.html |
| Etkinlik galerisi | `.../etkinlik.html?slug=SLUG` |
| API | https://api-production-137f.up.railway.app |

## Tekrar düşmemek gereken tuzaklar

Bunların hepsi gerçek hata olarak yaşandı ve düzeltildi — kod gözden
geçirilerek değil, tarayıcıda test edilirken bulundular.

### 1. GitHub Pages'te cache yönetimi yok → `?v=N` şart

Pages için cache-control ayarı yapılamıyor. **Bir JS dosyasını her
değiştirdiğinde, onu çağıran `<script src="...?v=N">` etiketindeki `N`'i
artır.** Yoksa özellikle mobil tarayıcılar eski JS'i servis etmeye devam eder.

Bir kere şuna mal oldu: telefon, `API_BASE_URL` güncellenip deploy edildikten
uzun süre sonra bile `localhost:8000`'e POST atmaya devam etti.

### 2. `[hidden]` özniteliği, `display` veren bir class'a karşı kaybeder

Hem `hidden` özniteliği hem de `display` belirleyen bir class taşıyan eleman
(ör. `.upload-form { display: flex }`) **gizlenmez** — yazar CSS'i, tarayıcının
varsayılan `[hidden] { display: none }` kuralını yener.

Genel çözüm `style.css` içinde duruyor, silme:

```css
[hidden] { display: none !important; }
```

### 3. Daktilo efekti ile async başlık güncellemesi yarışıyor

`script.js`'teki daktilo efekti metni bir kere yakalayıp zincirleme
`setTimeout`'larla yazıyor. Efekt çalışırken başka bir script (ör. fetch'i
dönen `gallery.js`) aynı elemanın `textContent`'ini değiştirirse, sıradaki
daktilo callback'leri birkaç saniye sonra yazıyı geri eziyor.

Çözüm: iptal edilebilir daktilo (`el._cancelTypewriter`) ve `script.js`
içindeki ortak `setHeadingText(el, text)` yardımcısı. **Sayfa açılışında
`script.js`'in de dokunduğu bir `h1`'i güncellerken düz `textContent = ...`
değil, `setHeadingText()` kullan.**

## Çalışma şekli

- `main` korumalı (admin dahil doğrudan push kapalı). Her değişiklik feature
  branch + PR ile gidiyor, CI yeşillenmeden merge yok.
- Frontend PR'ı merge edildikten sonra **GitHub Pages deploy workflow'unun da
  başarılı olduğunu kontrol et** — merge tek başına "canlıya çıktı" demek değil.
- Gerçek testler tarayıcıda (masaüstü + telefon) yapılıyor.

## Etkinlik galerisi akışı

Davetli QR'dan `etkinlik.html?slug=...` adresine gelir, fotoğraf yükler
(galeriden seçer ya da telefonda kamerayla çeker), isterse **"sadece etkinlik
sahipleri görsün"** işaretler. Onaylanan fotoğraflar galeride üç görünümde
gezilir: **ağaç** (varsayılan), **küre**, **ızgara**.

Bilmesi gerekenler:

- Galeri **60'lık sayfalar** halinde yükleniyor; toplam sayı `X-Total-Count`
  başlığından geliyor. Ağaç ilk 32, küre ilk 60 fotoğrafı gösteriyor
  (bilinçli sınır: 500 parçalı dönen küre telefonda ağırlaşır), ızgara hepsini.
- Parçalarda backend'in ürettiği **küçük kopya** kullanılıyor, büyütme
  katmanı orijinali açıyor.
- Küre **WebGL değil CSS 3B**. Fotoğraflar R2'den farklı origin'den geldiği
  için WebGL dokusu bucket'ta CORS politikası ister; CSS tarafında böyle bir
  kısıt yok.
- `capture` niteliği **mevcut dosya girişine eklenmemeli**: iOS'ta galeriyi
  tamamen kapatıyor. Kamera için ayrı bir giriş var.
- Yükleme **çoklu seçim** destekliyor; dosyalar tek tek ve sırayla
  gönderiliyor. Sınıra takılınca kalanlar iptal ediliyor ve kullanıcıya kaçının
  gittiği söyleniyor.
- Yükleme **KVKK onayına bağlı**: kutu işaretlenmeden istek atılmıyor,
  sunucu da rızasız isteği 400 ile reddediyor. Rıza sunucuda zaman damgası ve
  metin sürümüyle saklanıyor; metin değişirse diyalogdaki `data-surum`
  güncellenmeli.
  Aydınlatma metni `etkinlik.html` içinde gömülü, yurt dışına aktarımı
  (Cloudflare R2 + Railway) açıkça söylüyor.
- Ağaçta fotoğraf boyu, dal uçlarının arasındaki mesafeden hesaplanıyor.
  Sabit boy verilirse ya üst üste biniyor ya da ağaç boş duruyor.

## Davetiye sayfaları

`davetiye.html` **vitrindeki demo**: isimler, aileler ve mekân kurgusaldır,
`urunler.html`'den bağlantı verilir. Gerçek bir çiftin davetiyesi bu dosyaya
yazılmaz.

Gerçek davetiye **kendi dosyasını alır** (`nida-yunus.html` gibi): hiçbir
sayfadan bağlantı verilmez, `<meta name="robots" content="noindex, nofollow">`
taşır ve altbarında "Dijital Çözümlerim ile hazırlandı" künyesi bulunur.
Gerçek kişilerin adı, tarihi ve adresi vitrine düşmesin diye.

Geri sayım tarihi `#invite` üzerindeki `data-tarih` özniteliğinden okunur;
iki sayfa da aynı `davetiye.js`'i paylaşır.

## Yapılmayanlar / sıradakiler

- Etkinlik sahibine e-posta/bildirim yok; onay bekleyen fotoğrafı görmek için
  panele bakmak gerekiyor.
- Yükleme sınırı cihaz jetonuna bağlı (kişi başı 5/saat) — jeton silinebilir,
  yani nezaket sınırı. Gerçek kontrol isteniyorsa kişiye özel davet linki
  gerekir.
- Galeride fotoğrafı yükleyenin adı gösterilmiyor; ad yalnızca panelde
  görünüyor.
