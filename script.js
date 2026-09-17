const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
    if (!prefersReducedMotion) {
        document.querySelector('.navbar')?.classList.add('is-visible');
        document.querySelector('.card')?.classList.add('is-visible');
    } else {
        document.querySelector('.navbar')?.classList.add('no-anim');
        document.querySelector('.card')?.classList.add('no-anim');
    }

    document.querySelectorAll('.btn').forEach((btn) => {
        btn.addEventListener('click', createRipple);
    });
});

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
