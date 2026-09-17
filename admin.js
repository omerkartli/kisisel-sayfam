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

    document.getElementById('loadPendingForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const slug = document.getElementById('reviewSlug').value.trim();
        loadPending(slug);
    });
});
