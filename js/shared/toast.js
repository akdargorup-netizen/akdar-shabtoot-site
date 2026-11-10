const CONTAINER_ID = 'toast-container';
function getContainer() {
let c = document.getElementById(CONTAINER_ID);
if (!c) {
c = document.createElement('div');
c.id = CONTAINER_ID;
c.setAttribute('aria-live', 'assertive');
c.setAttribute('aria-atomic', 'true');
document.body.appendChild(c);
}
return c;
}
export function showToast(message, type = 'info', duration = 3000, options = {}) {
const container = getContainer();
const toast = document.createElement('div');
toast.className = `toast toast--${type}`;
toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
if (options.onClick) {
toast.classList.add('toast--clickable');
toast.addEventListener('click', options.onClick);
}
const icons = {
success: '<polyline points="20 6 9 17 4 12"/>',
error:   '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>',
};
toast.innerHTML = `
    <svg class="toast__icon" width="18" height="18" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      ${icons[type] ?? icons.info}
    </svg>
    <span class="toast__message"></span>
  `;
toast.querySelector('.toast__message').textContent = String(message ?? '');
container.appendChild(toast);
requestAnimationFrame(() => toast.classList.add('toast--visible'));
setTimeout(() => {
toast.classList.remove('toast--visible');
toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}, duration);
}
