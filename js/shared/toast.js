const CONTAINER_ID = 'toast-container';
const MAX_VISIBLE = 3;
const active = new Map();
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
function removeToast(key, toast) {
const entry = active.get(key);
if (entry && entry.toast === toast) { clearTimeout(entry.timer); active.delete(key); }
toast.classList.remove('toast--visible');
let done = false;
const fin = () => { if (done) return; done = true; toast.remove(); };
toast.addEventListener('transitionend', fin, { once: true });
setTimeout(fin, 450);
}
export function showToast(message, type = 'info', duration = 3000, options = {}) {
const container = getContainer();
const text = String(message ?? '');
const key = `${type}|${text}`;
const dup = active.get(key);
if (dup && dup.toast.isConnected) {
clearTimeout(dup.timer);
dup.timer = setTimeout(() => removeToast(key, dup.toast), duration);
try { dup.toast.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 220 }); } catch {   }
return;
}
while (container.children.length >= MAX_VISIBLE) {
const oldest = container.firstElementChild;
const k = [...active.entries()].find(([, v]) => v.toast === oldest)?.[0];
if (k) active.delete(k);
oldest.remove();
}
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
toast.querySelector('.toast__message').textContent = text;
container.appendChild(toast);
requestAnimationFrame(() => toast.classList.add('toast--visible'));
const timer = setTimeout(() => removeToast(key, toast), duration);
active.set(key, { toast, timer });
}
