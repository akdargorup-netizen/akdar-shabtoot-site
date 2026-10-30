const BANNER_ID        = 'update-banner';
const RELOAD_DELAY_MS  = 450;
const FORCE_AFTER_MS   = 2500;
const GIVE_UP_AFTER_MS = 9000;
const ICON_REFRESH = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
    <path d="M16 16h5v5"/>
  </svg>`;
let updating = false;
export function showUpdateBanner() {
if (document.getElementById(BANNER_ID)) return;
const banner = document.createElement('div');
banner.id = BANNER_ID;
banner.className = 'update-banner';
banner.setAttribute('role', 'status');
banner.setAttribute('aria-live', 'polite');
banner.innerHTML = `
    <div class="update-banner__icon">${ICON_REFRESH}</div>
    <div class="update-banner__text">
      <strong class="update-banner__title">تحديث جديد جاهز</strong>
      <span class="update-banner__sub">حدّث الآن لتحصل على أحدث نسخة</span>
    </div>
    <button type="button" class="update-banner__close" aria-label="لاحقًا">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
    <button type="button" class="update-banner__btn">
      <span class="update-banner__spinner" aria-hidden="true"></span>
      <span class="update-banner__btn-label">حدّث الآن</span>
    </button>
  `;
document.body.appendChild(banner);
requestAnimationFrame(() => banner.classList.add('update-banner--visible'));
const btn   = banner.querySelector('.update-banner__btn');
const label = banner.querySelector('.update-banner__btn-label');
btn.addEventListener('click', () => applyUpdate(banner, btn, label));
banner.querySelector('.update-banner__close').addEventListener('click', () => {
if (updating) return;
hideBanner(banner);
});
}
function hideBanner(banner) {
banner.classList.remove('update-banner--visible');
setTimeout(() => banner.remove(), 350);
}
function freshUrl() {
const url = new URL(location.href);
url.searchParams.set('_u', Date.now().toString(36));
return url.toString();
}
async function forceRefresh() {
try {
if ('caches' in window) {
const keys = await caches.keys();
const KEEP = /^(shabtoot-images-|akdar-clips-|shabtoot-fonts-|shabtoot-quran-|shabtoot-thumbs-|shabtoot-firebase-sdk-|shabtoot-supabase-sdk-)/;
await Promise.all(keys.filter(k => !KEEP.test(k)).map(k => caches.delete(k)));
}
} catch {   }
try {
const regs = await navigator.serviceWorker?.getRegistrations?.();
if (regs) await Promise.all(regs.map(r => r.unregister()));
} catch {   }
location.replace(freshUrl());
}
async function applyUpdate(banner, btn, label) {
if (updating) return;
updating = true;
btn.disabled = true;
banner.classList.add('update-banner--loading');
label.textContent = 'جاري التحديث…';
try {
const reg = await navigator.serviceWorker?.getRegistration();
reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
reg?.installing?.postMessage({ type: 'SKIP_WAITING' });
} catch {   }
setTimeout(() => location.reload(), RELOAD_DELAY_MS);
setTimeout(() => {
if (!document.body.contains(banner)) return;
forceRefresh();
}, FORCE_AFTER_MS);
setTimeout(() => {
if (!document.body.contains(banner)) return;
updating = false;
btn.disabled = false;
banner.classList.remove('update-banner--loading');
label.textContent = 'حاول مرة أخرى';
}, GIVE_UP_AFTER_MS);
}
