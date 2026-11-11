import { showToast } from './toast.js';
const BAR_ID = 'connectivity-bar';
function getBar() {
let bar = document.getElementById(BAR_ID);
if (!bar) {
bar = document.createElement('div');
bar.id = BAR_ID;
bar.setAttribute('role', 'status');
bar.setAttribute('aria-live', 'polite');
document.getElementById('app')?.prepend(bar) ?? document.body.prepend(bar);
}
return bar;
}
function showOffline() {
const bar = getBar();
bar.className = 'connectivity-bar connectivity-bar--offline';
bar.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <circle cx="12" cy="20" r="1"/>
    </svg>
    <span>انقطع الاتصال</span>
  `;
}
function showOnline() {
const bar = getBar();
bar.className = 'connectivity-bar connectivity-bar--online';
bar.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>عاد الاتصال ✓</span>
  `;
setTimeout(() => {
bar.className = 'connectivity-bar connectivity-bar--hidden';
}, 3000);
}
export function initConnectivity() {
if (!navigator.onLine) showOffline();
window.addEventListener('offline', showOffline);
window.addEventListener('online',  showOnline);
window.addEventListener('akdar:data-from-cache', () => {
showToast('إنت شايف بيانات محفوظة في جهازك — افتح النت عشان تجيب آخر تحديث', 'info', 5000);
});
}
