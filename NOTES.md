# Proje Notları

Bu dosya, projeye bir süre ara verdikten (veya yeni bir bilgisayara geçtikten)
sonra hatırlanması gereken şeyleri tutar. Koddan ya da git geçmişinden kolayca
çıkarılamayan bilgiler burada.

## Genel yapı

- **Frontend (bu repo)**: statik "link in bio" tarzı kişisel sayfa, build adımı
  yok — düz HTML/CSS/JS. GitHub Pages'e deploy oluyor.
- **Ürün tarafı bu repoda değil.** Davetiye, etkinlik galerisi ve yönetim
  paneli 23 Eylül 2026'da [`dijital-cozumlerim`](https://github.com/omerkartli/dijital-cozumlerim)
  reposuna taşındı. Burada yalnızca `urunler.html`, `etkinlik.html`,
  `admin.html`, `davetiye.html` ve `nida-yunus.html` için **yönlendirme
  sayfaları** duruyor; paylaşılmış bağlantılar ve üretilmiş QR'lar kırılmasın
  diye. Sorgu dizesi (`?slug=...`) yönlendirmede korunuyor.
- Backend (`kisisel-sayfam-backend`) da ayrı repo ve ürün tarafına hizmet
  ediyor; bu sayfanın ona hiç ihtiyacı yok.

### Canlı adresler

| Ne | Adres |
|---|---|
| Kişisel sayfa | https://omerkartli.github.io/kisisel-sayfam/ |
| Dijital Çözümlerim (ayrı repo) | https://omerkartli.github.io/dijital-cozumlerim/ |

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

## Yapılmayanlar / sıradakiler

- Etkinlik sahibine e-posta/bildirim yok; onay bekleyen fotoğrafı görmek için
  panele bakmak gerekiyor.
- Yükleme sınırı cihaz jetonuna bağlı (kişi başı 5/saat) — jeton silinebilir,
  yani nezaket sınırı. Gerçek kontrol isteniyorsa kişiye özel davet linki
  gerekir.
- Galeride fotoğrafı yükleyenin adı gösterilmiyor; ad yalnızca panelde
  görünüyor.
