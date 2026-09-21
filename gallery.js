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
            return;
        }
        const event = await response.json();
        setHeadingText(titleEl, event.name);
        statusEl.textContent = 'Fotoğrafını yükle, onaylandıktan sonra burada görünecek.';
    } catch (err) {
        statusEl.textContent = 'Sunucuya bağlanılamadı.';
    }
}

async function loadPhotos(slug) {
    const gallery = document.getElementById('gallery');

    try {
        const response = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(slug)}/photos`);
        if (!response.ok) return;

        const photos = await response.json();
        gallery.innerHTML = '';

        if (photos.length === 0) {
            gallery.innerHTML = '<p class="bio">Henüz onaylanmış fotoğraf yok.</p>';
            return;
        }

        photos.forEach((photo) => {
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = 'Etkinlik fotoğrafı';
            img.className = 'gallery-item';
            img.loading = 'lazy';
            gallery.appendChild(img);
        });
    } catch (err) {
        gallery.innerHTML = '<p class="bio">Fotoğraflar yüklenemedi.</p>';
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

    message.textContent = 'Yükleniyor...';

    try {
        const response = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(slug)}/photos`, {
            method: 'POST',
            body: formData,
        });

        if (response.status === 201) {
            message.textContent = 'Teşekkürler! Fotoğrafın onaylandıktan sonra galeride görünecek.';
            event.target.reset();
        } else if (response.status === 415) {
            message.textContent = 'Sadece resim dosyaları yüklenebilir.';
        } else if (response.status === 413) {
            message.textContent = 'Dosya çok büyük (maksimum 15MB).';
        } else if (response.status === 429) {
            message.textContent = 'Çok fazla yükleme yaptın, biraz sonra tekrar dene.';
        } else {
            message.textContent = 'Bir şeyler ters gitti, tekrar dene.';
        }
    } catch (err) {
        message.textContent = 'Sunucuya bağlanılamadı.';
    }
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

    loadEvent(slug);
    loadPhotos(slug);
    form.addEventListener('submit', (event) => handleUpload(event, slug));
});
