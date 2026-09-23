const CIHAZ_ANAHTARI = 'cihaz_jetonu';

function cihazJetonu() {
    // Yükleme sınırı kişi başı işlesin diye tarayıcıda kalıcı bir jeton tutuyoruz.
    // Silinebilir olduğu için güvenlik değil, nezaket sınırı: aynı Wi-Fi'daki
    // davetliler birbirinin hakkını yemesin diye var.
    try {
        let jeton = localStorage.getItem(CIHAZ_ANAHTARI);
        if (!jeton) {
            jeton = (crypto.randomUUID?.() || String(Math.random()).slice(2))
                .replace(/-/g, '')
                .slice(0, 32);
            localStorage.setItem(CIHAZ_ANAHTARI, jeton);
        }
        return jeton;
    } catch (err) {
        return null; // gizli sekmede depolama kapalı olabilir; sunucu IP'ye düşer
    }
}

function getSlugFromUrl() {
    return new URLSearchParams(window.location.search).get('slug');
}

async function loadEvent(slug) {
    const titleEl = document.getElementById('eventTitle');
    const statusEl = document.getElementById('eventStatus');

    try {
        const response = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(slug)}`);
        if (!response.ok) {
            setHeadingText(titleEl, 'Etkinlik bulunamadı');
            statusEl.textContent = 'Bu bağlantı geçerli bir etkinliğe ait değil.';
            document.getElementById('uploadForm').hidden = true;
            document.getElementById('sahne').hidden = true;
            return;
        }
        const event = await response.json();
        setHeadingText(titleEl, event.name);
        statusEl.textContent = 'Fotoğrafını yükle; onaylandıktan sonra galeride görünecek.';
    } catch (err) {
        statusEl.textContent = 'Sunucuya bağlanılamadı.';
    }
}

const KURE_SINIR = 60; // küreye en fazla bu kadar fotoğraf yerleştirilir
let fotograflar = [];
let kureParcalari = [];
let kureAktif = false;
let kureCiziyor = false;
let kureCizdir = null;
let gorunumSec = null;
let kureYaricap = 240;

function kureYaricapHesapla(adet) {
    const alan = document.getElementById('kureAlan');
    const taban = Math.min(alan.clientWidth, alan.clientHeight);
    // Fotoğraf sayısı arttıkça küre biraz büyüsün ki parçalar üst üste binmesin
    const yogunluk = Math.min(1.25, Math.sqrt(Math.max(adet, 8) / 26));
    return Math.max(150, Math.min(340, taban * 0.52 * yogunluk));
}

function kureyiDoldur(liste) {
    const kure = document.getElementById('kure');
    const alan = document.getElementById('kureAlan');
    kure.innerHTML = '';
    kureYaricap = kureYaricapHesapla(liste.length);
    kureParcalari = [];

    const dar = alan.clientWidth < 560;
    const parcaBoy = Math.round(
        Math.max(dar ? 52 : 72, Math.min(dar ? 88 : 132, (kureYaricap * 1.7) / Math.sqrt(Math.max(liste.length, 4)))),
    );

    const altinAci = Math.PI * (3 - Math.sqrt(5));

    liste.forEach((photo, i) => {
        // Fibonacci dağılımı: noktalar küre yüzeyine eşit aralıkla oturur
        const y = 1 - ((i + 0.5) / liste.length) * 2;
        const halkaYaricap = Math.sqrt(Math.max(0, 1 - y * y));
        const aci = altinAci * i;

        const parca = document.createElement('button');
        parca.type = 'button';
        parca.className = 'kure-parca';
        parca.style.width = `${parcaBoy}px`;
        parca.style.height = `${parcaBoy}px`;
        parca.style.margin = `${-parcaBoy / 2}px 0 0 ${-parcaBoy / 2}px`;
        parca.style.borderRadius = `${Math.round(parcaBoy * 0.15)}px`;
        parca.style.opacity = '0';
        parca.setAttribute('aria-label', `${i + 1}. fotoğrafı büyüt`);

        const img = document.createElement('img');
        img.src = photo.thumb_url || photo.url;
        img.alt = '';
        img.loading = i < 12 ? 'eager' : 'lazy';
        img.addEventListener('load', () => {
            kayit.yuklendi = performance.now();
        });
        img.addEventListener('error', () => {
            parca.remove();
            kayit.silindi = true;
        });
        parca.appendChild(img);
        parca.addEventListener('click', () => lightboxAc(i));
        kure.appendChild(parca);

        const kayit = {
            el: parca,
            x: halkaYaricap * Math.cos(aci),
            y: y,
            z: halkaYaricap * Math.sin(aci),
            yuklendi: 0,
            silindi: false,
        };
        kureParcalari.push(kayit);
    });
}

/* --- Ağaç görünümü --- */

const AGAC_SINIR = 32;

function rastgele(tohum) {
    // Sabit tohumlu üretici: sayfa her açıldığında ağaç aynı dursun
    let t = tohum;
    return () => {
        t = (t * 1103515245 + 12345) % 2147483648;
        return t / 2147483648;
    };
}

function agaciKur(liste) {
    const alan = document.getElementById('agacAlan');
    const svg = document.getElementById('agacDallar');
    const meyveler = document.getElementById('agacMeyveler');

    const G = alan.clientWidth;
    const Y = alan.clientHeight;
    if (!G || !Y) return;

    svg.setAttribute('viewBox', `0 0 ${G} ${Y}`);
    svg.innerHTML = '';
    meyveler.innerHTML = '';

    const enKucuk = G < 560 ? 48 : 64;
    const enBuyuk = G < 560 ? 88 : 132;
    // Parça boyu, seçilen dal uçlarının arasındaki mesafeden hesaplanacak
    let parcaBoy = enKucuk;
    const rnd = rastgele(97);
    const dallar = [];
    const uclar = [];

    // Fotoğraf sayısının en az iki katı uç üret: aralarından seyrek olanları seçeceğiz
    // Fotoğraf sayısının iki katı uç: aralarından seyrek olanları seçeceğiz
    const derinlik = Math.min(6, Math.max(3, Math.ceil(Math.log2(Math.max(liste.length, 2))) + 1));

    function dal(x, y, aci, uzunluk, kalan) {
        const x2 = x + Math.cos(aci) * uzunluk;
        const y2 = y + Math.sin(aci) * uzunluk;
        dallar.push({ x1: x, y1: y, x2, y2, kalan });

        if (kalan === 0) {
            uclar.push({ x: x2, y: y2 });
            return;
        }

        const sapma = 0.54 + rnd() * 0.2;
        const kisalma = 0.74 + rnd() * 0.08;
        dal(x2, y2, aci - sapma, uzunluk * kisalma, kalan - 1);
        dal(x2, y2, aci + sapma, uzunluk * kisalma, kalan - 1);
    }

    dal(0, 0, -Math.PI / 2, 34, derinlik);

    // Ağacı alana sığdır: tüm noktaları kutuya oturt
    const tumX = dallar.flatMap((d) => [d.x1, d.x2]);
    const tumY = dallar.flatMap((d) => [d.y1, d.y2]);
    const minX = Math.min(...tumX);
    const maxX = Math.max(...tumX);
    const minY = Math.min(...tumY);
    const maxY = Math.max(...tumY);

    const bosluk = enBuyuk * 0.62;
    const olcek = Math.min(
        (G - bosluk * 2) / Math.max(1, maxX - minX),
        (Y - bosluk * 1.6) / Math.max(1, maxY - minY),
    );
    const kaydirX = (G - (maxX - minX) * olcek) / 2 - minX * olcek;
    const kaydirY = Y - bosluk * 0.4 - maxY * olcek;

    const ge = (p) => ({ x: p.x * olcek + kaydirX, y: p.y * olcek + kaydirY });

    dallar.forEach((d) => {
        const a = ge({ x: d.x1, y: d.y1 });
        const b = ge({ x: d.x2, y: d.y2 });
        const yol = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        yol.setAttribute('d', `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
        yol.setAttribute('stroke-width', String(1 + d.kalan * 2.2));
        svg.appendChild(yol);
    });

    // Fotoğrafları tepeye dengeli dağıt: her adımda seçilenlere en uzak ucu al
    const ekranUclari = uclar.map(ge);
    const secilen = [];

    if (ekranUclari.length) {
        // En yüksek uçtan başla
        let ilk = 0;
        ekranUclari.forEach((uc, i) => {
            if (uc.y < ekranUclari[ilk].y) ilk = i;
        });
        secilen.push(ekranUclari[ilk]);

        const kalanlar = ekranUclari.filter((_, i) => i !== ilk);

        while (secilen.length < liste.length && kalanlar.length) {
            let enIyi = 0;
            let enIyiUzaklik = -1;

            kalanlar.forEach((uc, i) => {
                let enYakin = Infinity;
                secilen.forEach((s) => {
                    const d = Math.hypot(s.x - uc.x, s.y - uc.y);
                    if (d < enYakin) enYakin = d;
                });
                if (enYakin > enIyiUzaklik) {
                    enIyiUzaklik = enYakin;
                    enIyi = i;
                }
            });

            secilen.push(kalanlar[enIyi]);
            kalanlar.splice(enIyi, 1);
        }
    }

    // Fotoğraf sırası tepede yukarıdan aşağıya, soldan sağa okunsun
    secilen.sort((a, b) => a.y - b.y || a.x - b.x);

    // Parça boyu: en yakın iki fotoğrafın arası kadar; böylece ne örtüşür ne boş kalır
    if (secilen.length > 1) {
        let enYakin = Infinity;
        secilen.forEach((a, i) => {
            secilen.forEach((b, j) => {
                if (i >= j) return;
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d < enYakin) enYakin = d;
            });
        });
        parcaBoy = Math.round(Math.max(enKucuk, Math.min(enBuyuk, enYakin * 0.92)));
    } else {
        parcaBoy = enBuyuk;
    }

    liste.forEach((photo, i) => {
        const uc = secilen[i];
        if (!uc) return;

        const parca = document.createElement('button');
        parca.type = 'button';
        parca.className = 'agac-parca';
        parca.style.width = `${parcaBoy}px`;
        parca.style.height = `${parcaBoy}px`;
        parca.style.margin = `${-parcaBoy / 2}px 0 0 ${-parcaBoy / 2}px`;
        parca.style.borderRadius = `${Math.round(parcaBoy * 0.18)}px`;
        parca.style.left = `${uc.x.toFixed(1)}px`;
        parca.style.top = `${(uc.y + parcaBoy * 0.34).toFixed(1)}px`;
        parca.style.animationDelay = `${-(i % 7) * 0.8}s`;
        parca.setAttribute('aria-label', `${i + 1}. fotoğrafı büyüt`);

        const img = document.createElement('img');
        img.src = photo.thumb_url || photo.url;
        img.alt = '';
        img.loading = i < 12 ? 'eager' : 'lazy';
        img.addEventListener('load', () => parca.classList.add('is-yuklendi'));
        img.addEventListener('error', () => parca.remove());
        parca.appendChild(img);

        // Fotoğrafı dala bağlayan sap
        const sap = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        sap.setAttribute('d', `M ${uc.x.toFixed(1)} ${uc.y.toFixed(1)} L ${uc.x.toFixed(1)} ${(uc.y + parcaBoy * 0.34).toFixed(1)}`);
        sap.setAttribute('stroke-width', '1.3');
        svg.appendChild(sap);

        parca.addEventListener('click', () => lightboxAc(i));
        meyveler.appendChild(parca);
    });
}

function izgarayiDoldur(liste) {
    const izgara = document.getElementById('izgara');
    izgara.innerHTML = '';

    liste.forEach((photo, i) => {
        const parca = document.createElement('button');
        parca.type = 'button';
        parca.className = 'izgara-parca';
        parca.setAttribute('aria-label', `${i + 1}. fotoğrafı büyüt`);

        const img = document.createElement('img');
        img.src = photo.thumb_url || photo.url;
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('load', () => parca.classList.add('is-yuklendi'));
        parca.appendChild(img);

        parca.addEventListener('click', () => lightboxAc(i));
        izgara.appendChild(parca);
    });
}

/* --- Küreyi döndürme --- */

function kureyiCalistir() {
    const alan = document.getElementById('kureAlan');

    let donusY = 0;
    let egimX = -6;
    let hiz = prefersReducedMotion ? 0 : 0.14;
    let suruklu = false;
    let sonX = 0;
    let sonY = 0;
    let hareket = 0;

    function ciz() {
        if (!kureAktif) {
            kureCiziyor = false;
            return;
        }
        if (!suruklu) {
            donusY += hiz;
            if (Math.abs(hiz) > 0.14) hiz *= 0.94; // sürükledikten sonra yavaşla
        }

        const sy = (donusY * Math.PI) / 180;
        const tx = (egimX * Math.PI) / 180;
        const cosY = Math.cos(sy);
        const sinY = Math.sin(sy);
        const cosX = Math.cos(tx);
        const sinX = Math.sin(tx);
        const simdi = performance.now();

        kureParcalari.forEach((p) => {
            if (p.silindi) return;

            // Noktayı döndür: önce y ekseni, sonra x ekseni
            const x1 = p.x * cosY + p.z * sinY;
            const z1 = -p.x * sinY + p.z * cosY;
            const y2 = p.y * cosX - z1 * sinX;
            const z2 = p.y * sinX + z1 * cosX;

            const X = x1 * kureYaricap;
            const Y = y2 * kureYaricap;
            const Z = z2 * kureYaricap;

            // Parça her zaman izleyiciye dönük kalsın: küre dönüşünün tersi
            p.el.style.transform =
                `translate3d(${X.toFixed(1)}px, ${Y.toFixed(1)}px, ${Z.toFixed(1)}px)` +
                ` rotateY(${-donusY}deg) rotateX(${-egimX}deg)`;

            // Arkaya düşen parçalar sönükleşsin
            const derinlik = 0.32 + 0.68 * ((z2 + 1) / 2);
            const acilis = p.yuklendi ? Math.min(1, (simdi - p.yuklendi) / 420) : 0;
            p.el.style.opacity = (derinlik * acilis).toFixed(3);
            p.el.style.zIndex = String(Math.round((z2 + 1) * 500));
        });

        requestAnimationFrame(ciz);
    }

    kureCizdir = () => {
        if (kureCiziyor) return;
        kureCiziyor = true;
        requestAnimationFrame(ciz);
    };
    kureCizdir();

    alan.addEventListener('pointerdown', (e) => {
        suruklu = true;
        hareket = 0;
        sonX = e.clientX;
        sonY = e.clientY;
        alan.classList.add('is-suruklu');
        alan.setPointerCapture(e.pointerId);
    });

    alan.addEventListener('pointermove', (e) => {
        if (!suruklu) return;
        const dx = e.clientX - sonX;
        const dy = e.clientY - sonY;
        sonX = e.clientX;
        sonY = e.clientY;
        hareket += Math.abs(dx) + Math.abs(dy);

        donusY += dx * 0.28;
        egimX = Math.max(-55, Math.min(55, egimX - dy * 0.2));
        hiz = Math.max(-2.4, Math.min(2.4, dx * 0.14));
    });

    function birak(e) {
        if (!suruklu) return;
        suruklu = false;
        alan.classList.remove('is-suruklu');
        if (alan.hasPointerCapture?.(e.pointerId)) alan.releasePointerCapture(e.pointerId);
        // Sürüklemenin sonu tıklama sayılmasın
        if (hareket > 8) {
            alan.addEventListener('click', (ev) => ev.stopPropagation(), { capture: true, once: true });
        }
        if (prefersReducedMotion) hiz = 0;
    }

    alan.addEventListener('pointerup', birak);
    alan.addEventListener('pointercancel', birak);

    let zamanlayici;
    window.addEventListener('resize', () => {
        clearTimeout(zamanlayici);
        zamanlayici = setTimeout(() => {
            if (!fotograflar.length) return;
            kureyiDoldur(fotograflar.slice(0, KURE_SINIR));
            if (!document.getElementById('agacAlan').hidden) {
                agaciKur(fotograflar.slice(0, AGAC_SINIR));
            }
        }, 200);
    });
}

/* --- Büyütme (lightbox) --- */

let aktifIndeks = 0;

function lightboxAc(indeks) {
    aktifIndeks = indeks;
    const kutu = document.getElementById('lightbox');
    kutu.hidden = false;
    document.body.classList.add('lb-acik');
    lightboxGoster();
    document.getElementById('lbKapat').focus();
}

function lightboxKapat() {
    document.getElementById('lightbox').hidden = true;
    document.body.classList.remove('lb-acik');
}

function lightboxGoster() {
    const foto = fotograflar[aktifIndeks];
    if (!foto) return;
    document.getElementById('lbGorsel').src = foto.url;
    document.getElementById('lbSayac').textContent = `${aktifIndeks + 1} / ${fotograflar.length}`;
}

function lightboxKaydir(yon) {
    if (!fotograflar.length) return;
    aktifIndeks = (aktifIndeks + yon + fotograflar.length) % fotograflar.length;
    lightboxGoster();
}

function lightboxKur() {
    const kutu = document.getElementById('lightbox');

    document.getElementById('lbKapat').addEventListener('click', lightboxKapat);
    document.getElementById('lbOnceki').addEventListener('click', () => lightboxKaydir(-1));
    document.getElementById('lbSonraki').addEventListener('click', () => lightboxKaydir(1));

    kutu.addEventListener('click', (e) => {
        if (e.target === kutu) lightboxKapat();
    });

    document.addEventListener('keydown', (e) => {
        if (kutu.hidden) return;
        if (e.key === 'Escape') lightboxKapat();
        if (e.key === 'ArrowLeft') lightboxKaydir(-1);
        if (e.key === 'ArrowRight') lightboxKaydir(1);
    });

    // Telefonda kaydırarak geçiş
    let baslangic = null;
    kutu.addEventListener('touchstart', (e) => {
        baslangic = e.touches[0].clientX;
    }, { passive: true });
    kutu.addEventListener('touchend', (e) => {
        if (baslangic === null) return;
        const fark = e.changedTouches[0].clientX - baslangic;
        if (Math.abs(fark) > 50) lightboxKaydir(fark > 0 ? -1 : 1);
        baslangic = null;
    });
}

function gorunumKur() {
    const dugmeler = {
        agac: document.getElementById('agacBtn'),
        kure: document.getElementById('kureBtn'),
        izgara: document.getElementById('izgaraBtn'),
    };
    const alanlar = {
        agac: document.getElementById('agacAlan'),
        kure: document.getElementById('kureAlan'),
        izgara: document.getElementById('izgara'),
    };
    const ipuclari = {
        agac: 'Fotoğrafa dokunarak büyüt',
        kure: 'Döndürmek için sürükle · Büyütmek için dokun',
        izgara: '',
    };
    const ipucu = document.getElementById('sahneIpucu');

    gorunumSec = (ad) => {
        Object.entries(dugmeler).forEach(([k, el]) => el.classList.toggle('is-secili', k === ad));
        Object.entries(alanlar).forEach(([k, el]) => { el.hidden = k !== ad; });

        ipucu.textContent = ipuclari[ad];
        ipucu.hidden = !ipuclari[ad];

        kureAktif = ad === 'kure';
        if (kureAktif && fotograflar.length) {
            // Alan gizliyken ölçü alınamaz; görünür olunca yarıçapı yeniden hesapla
            kureyiDoldur(fotograflar.slice(0, KURE_SINIR));
            if (kureCizdir) kureCizdir();
        }
        if (ad === 'agac' && fotograflar.length) agaciKur(fotograflar.slice(0, AGAC_SINIR));
    };

    Object.keys(dugmeler).forEach((ad) => {
        dugmeler[ad].addEventListener('click', () => gorunumSec(ad));
    });
}

const SAYFA_BOYU = 60;
let toplamFotograf = 0;
let sayfaYukleniyor = false;

async function sayfaGetir(slug, offset) {
    const adres = `${API_BASE_URL}/events/${encodeURIComponent(slug)}/photos`
        + `?limit=${SAYFA_BOYU}&offset=${offset}`;
    const response = await fetch(adres);
    if (!response.ok) throw new Error('liste alınamadı');

    const toplam = Number(response.headers.get('X-Total-Count'));
    return { liste: await response.json(), toplam: Number.isFinite(toplam) ? toplam : 0 };
}

function dahaFazlaGuncelle() {
    const btn = document.getElementById('dahaFazla');
    const kalan = toplamFotograf - fotograflar.length;
    btn.hidden = kalan <= 0;
    btn.textContent = sayfaYukleniyor
        ? 'Yükleniyor...'
        : `${Math.min(kalan, SAYFA_BOYU)} fotoğraf daha yükle`;
    btn.disabled = sayfaYukleniyor;
}

function gorunumleriTazele() {
    const sayi = document.getElementById('galeriSayi');
    sayi.textContent = toplamFotograf > fotograflar.length
        ? `${fotograflar.length} / ${toplamFotograf} fotoğraf`
        : `${fotograflar.length} fotoğraf`;

    izgarayiDoldur(fotograflar);
    if (!document.getElementById('agacAlan').hidden) {
        agaciKur(fotograflar.slice(0, AGAC_SINIR));
    }
    if (kureAktif) {
        kureyiDoldur(fotograflar.slice(0, KURE_SINIR));
        if (kureCizdir) kureCizdir();
    }
    dahaFazlaGuncelle();
}

async function sonrakiSayfa(slug) {
    if (sayfaYukleniyor || fotograflar.length >= toplamFotograf) return;

    sayfaYukleniyor = true;
    dahaFazlaGuncelle();

    try {
        const { liste, toplam } = await sayfaGetir(slug, fotograflar.length);
        toplamFotograf = toplam || toplamFotograf;
        fotograflar = fotograflar.concat(liste);
    } catch (err) {
        document.getElementById('galeriDurum').textContent = 'Fotoğraflar yüklenemedi.';
    } finally {
        sayfaYukleniyor = false;
        gorunumleriTazele();
    }
}

async function loadPhotos(slug) {
    const durum = document.getElementById('galeriDurum');

    try {
        const { liste, toplam } = await sayfaGetir(slug, 0);
        fotograflar = liste;
        toplamFotograf = toplam || liste.length;

        if (fotograflar.length === 0) {
            durum.textContent = 'Henüz onaylanmış fotoğraf yok. İlk fotoğrafı sen yükle.';
            document.getElementById('agacAlan').hidden = true;
            document.getElementById('kureAlan').hidden = true;
            document.getElementById('sahneIpucu').hidden = true;
            return;
        }

        durum.textContent = '';

        const ipucu = document.getElementById('galeriIpucu');
        document.getElementById('galeriIpucuMetin').textContent =
            `${toplamFotograf} fotoğrafı gör`;
        ipucu.hidden = false;
        ipucu.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('sahne').scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                block: 'start',
            });
        });

        kureyiCalistir();
        gorunumSec('agac');
        gorunumleriTazele();

        document.getElementById('dahaFazla').addEventListener('click', () => sonrakiSayfa(slug));
    } catch (err) {
        durum.textContent = 'Fotoğraflar yüklenemedi.';
    }
}

async function handleUpload(event, slug) {
    event.preventDefault();

    const fileInput = document.getElementById('photoInput');
    const nameInput = document.getElementById('uploaderName');
    const message = document.getElementById('uploadMessage');

    if (!fileInput.files.length) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    if (nameInput.value.trim()) {
        formData.append('uploader_name', nameInput.value.trim());
    }

    const ozelMi = document.getElementById('ozelMi').checked;
    if (ozelMi) {
        formData.append('is_private', 'true');
    }

    message.textContent = 'Yükleniyor...';

    try {
        const jeton = cihazJetonu();
        const response = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(slug)}/photos`, {
            method: 'POST',
            headers: jeton ? { 'X-Cihaz': jeton } : {},
            body: formData,
        });

        if (response.status === 201) {
            message.textContent = ozelMi
                ? 'Teşekkürler! Bu fotoğraf galeride görünmeyecek, yalnızca etkinlik sahiplerine iletildi.'
                : 'Teşekkürler! Fotoğrafın onaylandıktan sonra galeride görünecek.';
            event.target.reset();
            document.getElementById('dropZone').classList.remove('is-secili');
        } else if (response.status === 415) {
            message.textContent = 'Sadece resim dosyaları yüklenebilir.';
        } else if (response.status === 413) {
            message.textContent = 'Dosya çok büyük (maksimum 15MB).';
        } else if (response.status === 429) {
            message.textContent = 'Saatlik yükleme sınırına ulaştın (5 fotoğraf). Bir süre sonra tekrar dene.';
        } else {
            message.textContent = 'Bir şeyler ters gitti, tekrar dene.';
        }
    } catch (err) {
        message.textContent = 'Sunucuya bağlanılamadı.';
    }
}

function yuklemeAlaniniKur() {
    const alan = document.getElementById('dropZone');
    const girdi = document.getElementById('photoInput');
    const etiket = document.getElementById('dosyaAdi');

    function dosyaSecildi() {
        const dosya = girdi.files[0];
        alan.classList.toggle('is-secili', Boolean(dosya));
        etiket.textContent = dosya ? dosya.name : 'Fotoğraf seç veya buraya sürükle';
    }

    girdi.addEventListener('change', dosyaSecildi);

    ['dragenter', 'dragover'].forEach((tur) => {
        alan.addEventListener(tur, (e) => {
            e.preventDefault();
            alan.classList.add('is-uzerinde');
        });
    });

    ['dragleave', 'drop'].forEach((tur) => {
        alan.addEventListener(tur, (e) => {
            e.preventDefault();
            alan.classList.remove('is-uzerinde');
        });
    });

    alan.addEventListener('drop', (e) => {
        if (!e.dataTransfer.files.length) return;
        girdi.files = e.dataTransfer.files;
        dosyaSecildi();
    });

    return dosyaSecildi;
}

document.addEventListener('DOMContentLoaded', () => {
    const slug = getSlugFromUrl();
    const form = document.getElementById('uploadForm');

    if (!slug) {
        setHeadingText(document.getElementById('eventTitle'), 'Etkinlik belirtilmedi');
        document.getElementById('eventStatus').textContent = 'Bağlantıda ?slug=... parametresi eksik.';
        form.hidden = true;
        return;
    }

    const dosyaSecildi = yuklemeAlaniniKur();
    lightboxKur();
    gorunumKur();

    loadEvent(slug);
    loadPhotos(slug);
    form.addEventListener('submit', (event) => handleUpload(event, slug).then(dosyaSecildi));
});
