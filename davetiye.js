// Örnek davetiye: zarf açılış animasyonu + canlı geri sayım
// Demo tarihi — gerçek kullanımda buradan değiştirilir.
// Tarih sayfadan okunuyor: demo ve gerçek davetiyeler aynı script'i paylaşıyor
const DUGUN_TARIHI = new Date(
    document.getElementById('invite')?.dataset.tarih || '2027-06-12T16:00:00+03:00',
);

const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const scene = document.getElementById('scene');
const envelope = document.getElementById('envelope');
const invite = document.getElementById('invite');
const tekrarIzle = document.getElementById('tekrarIzle');

let acildi = false;
const zamanlayicilar = [];

function bekle(ms, fn) {
    zamanlayicilar.push(setTimeout(fn, ms));
}

function zamanlayicilariTemizle() {
    while (zamanlayicilar.length) clearTimeout(zamanlayicilar.pop());
}

function davetiyeyiGoster() {
    invite.classList.add('is-shown');
    tekrarIzle.hidden = azHareket;
    // display:none -> block geçişi işlensin diye reflow zorla. requestAnimationFrame
    // kullanmıyoruz: sekme arka plandayken hiç tetiklenmez ve davetiye opacity:0 kalırdı.
    void invite.offsetHeight;
    invite.classList.add('is-in');
}

function zarfiAc() {
    if (acildi) return;
    acildi = true;

    if (azHareket) {
        scene.classList.add('is-gone');
        davetiyeyiGoster();
        return;
    }

    scene.classList.add('is-open');           // mühür söner, kapak katlanmaya başlar
    bekle(600, () => scene.classList.add('is-flap-back'));  // kapak mektubun arkasına geçsin
    bekle(1000, () => scene.classList.add('is-lifted'));    // mektup zarftan süzülerek çıksın
    bekle(1900, () => scene.classList.add('is-gone'));      // zarf sahnesi sönsün
    bekle(2250, davetiyeyiGoster);
}

function basaSar(event) {
    event.preventDefault();
    zamanlayicilariTemizle();
    invite.classList.remove('is-in');
    bekle(700, () => {
        invite.classList.remove('is-shown');
        scene.classList.remove('is-gone', 'is-open', 'is-flap-back', 'is-lifted');
        tekrarIzle.hidden = true;
        acildi = false;
    });
}

envelope.addEventListener('click', zarfiAc);
tekrarIzle.addEventListener('click', basaSar);

// --- Canlı geri sayım ---

const alanlar = {
    gun: document.getElementById('gun'),
    saat: document.getElementById('saat'),
    dakika: document.getElementById('dakika'),
    saniye: document.getElementById('saniye')
};
const not = document.getElementById('gerisayimNot');

function ikiHane(sayi) {
    return String(sayi).padStart(2, '0');
}

function sayaciGuncelle() {
    const kalan = DUGUN_TARIHI - Date.now();

    if (kalan <= 0) {
        alanlar.gun.textContent = '00';
        alanlar.saat.textContent = '00';
        alanlar.dakika.textContent = '00';
        alanlar.saniye.textContent = '00';
        not.textContent = 'Mutlu günler dileriz!';
        return false;
    }

    const toplamSaniye = Math.floor(kalan / 1000);
    alanlar.gun.textContent = ikiHane(Math.floor(toplamSaniye / 86400));
    alanlar.saat.textContent = ikiHane(Math.floor(toplamSaniye / 3600) % 24);
    alanlar.dakika.textContent = ikiHane(Math.floor(toplamSaniye / 60) % 60);
    alanlar.saniye.textContent = ikiHane(toplamSaniye % 60);

    not.textContent = 'Bu güzel günde sizi de aramızda görmek isteriz.';

    return true;
}

sayaciGuncelle();
const sayacAraligi = setInterval(() => {
    if (!sayaciGuncelle()) clearInterval(sayacAraligi);
}, 1000);
