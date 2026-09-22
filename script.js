// API adresi: yerelden açıldığında yerel backend, canlıda Railway.
// admin.js ve gallery.js bunu kullanır; ikisi de script.js'ten sonra yüklenir.
const YEREL_MI = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = YEREL_MI
    ? 'http://127.0.0.1:8000'
    : 'https://api-production-137f.up.railway.app';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
    const revealClass = prefersReducedMotion ? 'no-anim' : 'is-visible';
    document.querySelectorAll('.card').forEach((el) => el.classList.add(revealClass));

    document.querySelectorAll('.btn').forEach((btn) => {
        btn.addEventListener('click', createRipple);
    });

    const heading = document.querySelector('h1');
    if (heading) {
        let text = heading.textContent;
        if (heading.hasAttribute('data-greeting')) {
            text = text.replace(/^[^,]+/, getGreeting());
        }

        if (prefersReducedMotion) {
            heading.textContent = text;
        } else {
            typeWriter(heading, text);
        }
    }
});

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return 'İyi geceler';
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
}

function typeWriter(el, text, speed = 45) {
    el.textContent = '';
    el.classList.add('is-typing');
    el._cancelTypewriter?.();
    let cancelled = false;
    el._cancelTypewriter = () => {
        cancelled = true;
    };
    let i = 0;

    (function step() {
        if (cancelled) return;
        el.textContent = text.slice(0, i);
        i++;
        if (i <= text.length) {
            setTimeout(step, speed);
        } else {
            el.classList.remove('is-typing');
        }
    })();
}

function setHeadingText(el, text) {
    el._cancelTypewriter?.();
    el.classList.remove('is-typing');
    el.textContent = text;
}

function createRipple(event) {
    if (prefersReducedMotion) return;

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

    button.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}
