const TOKEN_KEY = 'admin_token';

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function showPanel() {
    document.getElementById('loginCard').hidden = true;
    document.getElementById('panelCard').hidden = false;
    loadEvents();
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    document.getElementById('loginCard').hidden = false;
    document.getElementById('panelCard').hidden = true;
}

async function login(password) {
    const message = document.getElementById('loginMessage');

    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (!response.ok) {
            message.textContent = 'Şifre yanlış.';
            return;
        }

        const data = await response.json();
        setToken(data.token);
        message.textContent = '';
        showPanel();
    } catch (err) {
        message.textContent = 'Sunucuya bağlanılamadı.';
    }
}

function eventUrl(slug) {
    return new URL(`etkinlik.html?slug=${encodeURIComponent(slug)}`, window.location.href).href;
}

function showShareLink(container, slug) {
    container.textContent = 'Oluşturuldu! Paylaşım linki: ';

    const link = document.createElement('a');
    link.href = eventUrl(slug);
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'paylasim-linki';
    link.textContent = eventUrl(slug);
    container.appendChild(link);
}

async function createEvent(slug, name) {
    const message = document.getElementById('createEventMessage');
    message.textContent = 'Oluşturuluyor...';

    try {
        const response = await fetch(`${API_BASE_URL}/admin/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ slug, name }),
        });

        if (response.status === 201) {
            showShareLink(message, slug);
            loadEvents();
        } else if (response.status === 409) {
            message.textContent = 'Bu slug zaten kullanılıyor.';
        } else if (response.status === 400) {
            message.textContent = 'Slug sadece küçük harf, rakam ve tire içerebilir.';
        } else if (response.status === 401) {
            message.textContent = 'Oturum süresi doldu, tekrar giriş yap.';
            logout();
        } else {
            message.textContent = 'Bir şeyler ters gitti.';
        }
    } catch (err) {
        message.textContent = 'Sunucuya bağlanılamadı.';
    }
}

async function fotograflariIndir(event, btn) {
    const eskiMetin = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Hazırlanıyor...';

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/events/${encodeURIComponent(event.slug)}/zip-token`,
            { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } },
        );

        if (response.status === 401) {
            logout();
            return;
        }
        if (!response.ok) {
            btn.textContent = 'Alınamadı';
            return;
        }

        const { token } = await response.json();
        // İndirmeyi tarayıcıya bırakıyoruz: dosya diske akar, belleğe alınmaz.
        window.location.href =
            `${API_BASE_URL}/admin/events/${encodeURIComponent(event.slug)}`
            + `/photos.zip?token=${encodeURIComponent(token)}`;
        btn.textContent = 'İndiriliyor...';
    } catch (err) {
        btn.textContent = 'Alınamadı';
    } finally {
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = eskiMetin;
        }, 2500);
    }
}

/* --- QR kod --- */

let qrAktifSlug = null;

function qrGoster(event) {
    const adres = eventUrl(event.slug);
    const katman = document.getElementById('qrKatman');

    qrAktifSlug = event.slug;
    document.getElementById('qrBaslik').textContent = event.name;
    document.getElementById('qrAdres').textContent = adres;

    if (typeof QRious === 'undefined') {
        document.getElementById('qrAdres').textContent =
            'QR kütüphanesi yüklenemedi. Linki elle paylaşabilirsin: ' + adres;
    } else {
        // Yüksek hata düzeltme seviyesi: masada kırışan/lekelenen çıktı da okunur
        new QRious({
            element: document.getElementById('qrTuval'),
            value: adres,
            size: 1024, // masa kartına basılabilsin diye yüksek çözünürlük
            level: 'H',
            background: '#ffffff',
            foreground: '#1f1c1a',
            padding: 48,
        });
    }

    katman.hidden = false;
    document.body.classList.add('lb-acik');
    document.getElementById('qrKapat').focus();
}

function qrKapat() {
    document.getElementById('qrKatman').hidden = true;
    document.body.classList.remove('lb-acik');
}

function qrKur() {
    const katman = document.getElementById('qrKatman');

    document.getElementById('qrKapat').addEventListener('click', qrKapat);
    katman.addEventListener('click', (e) => {
        if (e.target === katman) qrKapat();
    });
    document.addEventListener('keydown', (e) => {
        if (!katman.hidden && e.key === 'Escape') qrKapat();
    });

    document.getElementById('qrIndir').addEventListener('click', () => {
        const baglanti = document.createElement('a');
        baglanti.download = `${qrAktifSlug || 'etkinlik'}-qr.png`;
        baglanti.href = document.getElementById('qrTuval').toDataURL('image/png');
        baglanti.click();
    });

    document.getElementById('qrKopyala').addEventListener('click', async () => {
        const btn = document.getElementById('qrKopyala');
        try {
            await navigator.clipboard.writeText(eventUrl(qrAktifSlug));
            btn.textContent = 'Kopyalandı';
        } catch (err) {
            btn.textContent = 'Kopyalanamadı';
        }
        setTimeout(() => { btn.textContent = 'Linki kopyala'; }, 1800);
    });
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderEvents(events) {
    const list = document.getElementById('eventList');
    list.innerHTML = '';

    if (events.length === 0) {
        list.innerHTML = '<p class="bio">Henüz etkinlik oluşturulmamış.</p>';
        return;
    }

    events.forEach((event) => {
        const row = document.createElement('div');
        row.className = 'event-row';

        const info = document.createElement('div');
        info.className = 'event-info';

        const name = document.createElement('span');
        name.className = 'event-name';
        name.textContent = event.name;
        info.appendChild(name);

        const meta = document.createElement('span');
        meta.className = 'event-meta';
        meta.textContent = `${event.slug} · ${formatDate(event.created_at)}`;
        info.appendChild(meta);

        const rozetler = document.createElement('span');
        rozetler.className = 'event-rozetler';

        if (event.pending_count > 0) {
            const bekleyen = document.createElement('span');
            bekleyen.className = 'tag event-rozet-bekleyen';
            bekleyen.textContent = `${event.pending_count} bekliyor`;
            rozetler.appendChild(bekleyen);
        }

        const onayli = document.createElement('span');
        onayli.className = 'tag';
        onayli.textContent = `${event.approved_count} onaylı`;
        rozetler.appendChild(onayli);

        if (event.private_count > 0) {
            const ozel = document.createElement('span');
            ozel.className = 'tag event-rozet-ozel';
            ozel.textContent = `${event.private_count} özel`;
            rozetler.appendChild(ozel);
        }

        info.appendChild(rozetler);
        row.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'event-actions';

        const reviewBtn = document.createElement('button');
        reviewBtn.type = 'button';
        reviewBtn.className = 'btn btn-kucuk';
        reviewBtn.textContent = 'Bekleyenler';
        reviewBtn.addEventListener('click', () => {
            document.getElementById('reviewSlug').value = event.slug;
            loadPending(event.slug);
            document.getElementById('pendingGrid').scrollIntoView({ behavior: 'smooth' });
        });
        actions.appendChild(reviewBtn);

        const indirilebilir = event.approved_count + (event.private_count || 0);
        if (indirilebilir > 0) {
            const indirBtn = document.createElement('button');
            indirBtn.type = 'button';
            indirBtn.className = 'btn btn-kucuk';
            indirBtn.textContent = `${indirilebilir} fotoğrafı indir`;
            indirBtn.addEventListener('click', () => fotograflariIndir(event, indirBtn));
            actions.appendChild(indirBtn);
        }

        const qrBtn = document.createElement('button');
        qrBtn.type = 'button';
        qrBtn.className = 'btn btn-kucuk';
        qrBtn.textContent = 'QR';
        qrBtn.addEventListener('click', () => qrGoster(event));
        actions.appendChild(qrBtn);

        const galleryLink = document.createElement('a');
        galleryLink.className = 'btn btn-kucuk';
        galleryLink.href = eventUrl(event.slug);
        galleryLink.target = '_blank';
        galleryLink.rel = 'noopener';
        galleryLink.textContent = 'Galeriyi Aç';
        actions.appendChild(galleryLink);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-kucuk btn-tehlike';
        deleteBtn.textContent = 'Sil';
        actions.appendChild(deleteBtn);

        row.appendChild(actions);

        const onay = buildDeleteConfirm(event, row, actions);
        deleteBtn.addEventListener('click', () => {
            actions.hidden = true;
            onay.hidden = false;
        });
        row.appendChild(onay);

        list.appendChild(row);
    });
}

async function deleteEvent(slug, row) {
    row.classList.add('is-siliniyor');

    try {
        const response = await fetch(`${API_BASE_URL}/admin/events/${encodeURIComponent(slug)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (response.status === 401) {
            logout();
            return;
        }
        if (response.status !== 204 && response.status !== 404) {
            row.classList.remove('is-siliniyor');
            row.querySelector('.event-onay-mesaj').textContent = 'Silinemedi, tekrar dene.';
            return;
        }

        loadEvents();
    } catch (err) {
        row.classList.remove('is-siliniyor');
        row.querySelector('.event-onay-mesaj').textContent = 'Sunucuya bağlanılamadı.';
    }
}

function buildDeleteConfirm(event, row, actions) {
    const onay = document.createElement('div');
    onay.className = 'event-onay';

    const mesaj = document.createElement('span');
    mesaj.className = 'event-onay-mesaj';
    const toplam = event.pending_count + event.approved_count;
    mesaj.textContent = toplam > 0
        ? `"${event.name}" ve ${toplam} fotoğrafı kalıcı olarak silinsin mi?`
        : `"${event.name}" silinsin mi?`;
    onay.appendChild(mesaj);

    const evetBtn = document.createElement('button');
    evetBtn.type = 'button';
    evetBtn.className = 'btn btn-kucuk btn-tehlike';
    evetBtn.textContent = 'Evet, sil';
    evetBtn.addEventListener('click', () => deleteEvent(event.slug, row));
    onay.appendChild(evetBtn);

    const vazgecBtn = document.createElement('button');
    vazgecBtn.type = 'button';
    vazgecBtn.className = 'btn btn-kucuk';
    vazgecBtn.textContent = 'Vazgeç';
    vazgecBtn.addEventListener('click', () => {
        onay.hidden = true;
        actions.hidden = false;
    });
    onay.appendChild(vazgecBtn);

    onay.hidden = true;
    return onay;
}

async function loadEvents() {
    const list = document.getElementById('eventList');
    list.innerHTML = '<p class="bio">Yükleniyor...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/admin/events`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (response.status === 401) {
            logout();
            return;
        }
        if (!response.ok) {
            list.innerHTML = '<p class="bio">Etkinlikler alınamadı.</p>';
            return;
        }

        renderEvents(await response.json());
    } catch (err) {
        list.innerHTML = '<p class="bio">Sunucuya bağlanılamadı.</p>';
    }
}

let aktifDurum = 'pending';

function fotografSilOnayi(photo, slug, item, actions) {
    const onay = document.createElement('div');
    onay.className = 'foto-onay';

    const evet = document.createElement('button');
    evet.type = 'button';
    evet.className = 'btn btn-kucuk btn-tehlike';
    evet.textContent = 'Kalıcı sil';
    evet.addEventListener('click', async () => {
        item.classList.add('is-siliniyor');
        const silindi = await fotografSil(photo.id);
        if (silindi) {
            loadPending(slug);
        } else {
            item.classList.remove('is-siliniyor');
            onay.hidden = true;
            actions.hidden = false;
        }
    });

    const vazgec = document.createElement('button');
    vazgec.type = 'button';
    vazgec.className = 'btn btn-kucuk';
    vazgec.textContent = 'Vazgeç';
    vazgec.addEventListener('click', () => {
        onay.hidden = true;
        actions.hidden = false;
    });

    onay.appendChild(evet);
    onay.appendChild(vazgec);
    onay.hidden = true;
    return onay;
}

function renderPending(photos, slug) {
    const grid = document.getElementById('pendingGrid');
    grid.innerHTML = '';

    if (photos.length === 0) {
        const bosMesaj = {
            pending: 'Onay bekleyen fotoğraf yok.',
            approved: 'Onaylanmış fotoğraf yok.',
            private: 'Sadece size gönderilmiş fotoğraf yok.',
        };
        grid.innerHTML = `<p class="bio">${bosMesaj[aktifDurum]}</p>`;
        return;
    }

    photos.forEach((photo) => {
        const item = document.createElement('div');
        item.className = 'gallery-admin-item';

        const img = document.createElement('img');
        img.src = photo.thumb_url || photo.url;
        img.alt = 'Etkinlik fotoğrafı';
        img.className = 'gallery-item';
        img.loading = 'lazy';
        item.appendChild(img);

        if (photo.uploader_name) {
            const name = document.createElement('p');
            name.className = 'gallery-admin-name';
            name.textContent = photo.uploader_name;
            item.appendChild(name);
        }

        const actions = document.createElement('div');
        actions.className = 'gallery-admin-actions';

        if (aktifDurum === 'pending') {
            const approveBtn = document.createElement('button');
            approveBtn.type = 'button';
            approveBtn.textContent = 'Onayla';
            approveBtn.className = 'btn';
            approveBtn.addEventListener('click', () => reviewPhoto(photo.id, 'approve', slug));

            const rejectBtn = document.createElement('button');
            rejectBtn.type = 'button';
            rejectBtn.textContent = 'Reddet';
            rejectBtn.className = 'btn';
            rejectBtn.addEventListener('click', () => reviewPhoto(photo.id, 'reject', slug));

            actions.appendChild(approveBtn);
            actions.appendChild(rejectBtn);
            item.appendChild(actions);
        } else {
            const silBtn = document.createElement('button');
            silBtn.type = 'button';
            silBtn.textContent = 'Sil';
            silBtn.className = 'btn btn-tehlike';
            actions.appendChild(silBtn);
            item.appendChild(actions);

            const onay = fotografSilOnayi(photo, slug, item, actions);
            silBtn.addEventListener('click', () => {
                actions.hidden = true;
                onay.hidden = false;
            });
            item.appendChild(onay);
        }

        grid.appendChild(item);
    });
}

async function fotografSil(photoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/photos/${photoId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (response.status === 401) {
            logout();
            return false;
        }
        return response.status === 204 || response.status === 404;
    } catch (err) {
        return false;
    }
}

async function loadPending(slug) {
    const grid = document.getElementById('pendingGrid');
    grid.innerHTML = '<p class="bio">Yükleniyor...</p>';

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/events/${encodeURIComponent(slug)}/photos?status=${aktifDurum}`,
            { headers: { Authorization: `Bearer ${getToken()}` } },
        );

        if (response.status === 401) {
            logout();
            return;
        }
        if (!response.ok) {
            grid.innerHTML = '<p class="bio">Etkinlik bulunamadı.</p>';
            return;
        }

        const photos = await response.json();
        renderPending(photos, slug);
    } catch (err) {
        grid.innerHTML = '<p class="bio">Sunucuya bağlanılamadı.</p>';
    }
}

async function reviewPhoto(photoId, action, slug) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/photos/${photoId}/${action}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (response.status === 401) {
            logout();
            return;
        }

        loadPending(slug);
    } catch (err) {
        // Sunucuya ulaşılamadı, kullanıcı tekrar deneyebilir.
    }
}

function durumSeciciKur() {
    const dugmeler = {
        pending: document.getElementById('bekleyenBtn'),
        approved: document.getElementById('onayliBtn'),
        private: document.getElementById('ozelBtn'),
    };

    Object.entries(dugmeler).forEach(([durum, el]) => {
        el.addEventListener('click', () => {
            aktifDurum = durum;
            Object.entries(dugmeler).forEach(([k, d]) => d.classList.toggle('is-secili', k === durum));

            const slug = document.getElementById('reviewSlug').value.trim();
            if (slug) loadPending(slug);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (getToken()) {
        showPanel();
    }

    document.getElementById('loginForm').addEventListener('submit', (event) => {
        event.preventDefault();
        login(document.getElementById('passwordInput').value);
    });

    document.getElementById('createEventForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const slug = document.getElementById('newEventSlug').value.trim();
        const name = document.getElementById('newEventName').value.trim();
        createEvent(slug, name);
    });

    qrKur();
    durumSeciciKur();
    document.getElementById('loadEventsBtn').addEventListener('click', loadEvents);

    document.getElementById('loadPendingForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const slug = document.getElementById('reviewSlug').value.trim();
        loadPending(slug);
    });
});
