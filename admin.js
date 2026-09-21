const API_BASE_URL = 'https://api-production-137f.up.railway.app';
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
            message.textContent = `Oluşturuldu! Paylaşım linki: etkinlik.html?slug=${slug}`;
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

        const galleryLink = document.createElement('a');
        galleryLink.className = 'btn btn-kucuk';
        galleryLink.href = `etkinlik.html?slug=${encodeURIComponent(event.slug)}`;
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

function renderPending(photos, slug) {
    const grid = document.getElementById('pendingGrid');
    grid.innerHTML = '';

    if (photos.length === 0) {
        grid.innerHTML = '<p class="bio">Onay bekleyen fotoğraf yok.</p>';
        return;
    }

    photos.forEach((photo) => {
        const item = document.createElement('div');
        item.className = 'gallery-admin-item';

        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = 'Onay bekleyen fotoğraf';
        img.className = 'gallery-item';
        item.appendChild(img);

        if (photo.uploader_name) {
            const name = document.createElement('p');
            name.className = 'gallery-admin-name';
            name.textContent = photo.uploader_name;
            item.appendChild(name);
        }

        const actions = document.createElement('div');
        actions.className = 'gallery-admin-actions';

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

        grid.appendChild(item);
    });
}

async function loadPending(slug) {
    const grid = document.getElementById('pendingGrid');
    grid.innerHTML = '<p class="bio">Yükleniyor...</p>';

    try {
        const response = await fetch(
            `${API_BASE_URL}/admin/events/${encodeURIComponent(slug)}/photos?status=pending`,
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

    document.getElementById('loadEventsBtn').addEventListener('click', loadEvents);

    document.getElementById('loadPendingForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const slug = document.getElementById('reviewSlug').value.trim();
        loadPending(slug);
    });
});
