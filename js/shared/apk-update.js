const REMOTE_URLS = [
'https://akdar-nine.vercel.app/content/apk-latest.json',
'https://akdar-shabtoot.web.app/content/apk-latest.json',
'https://akdargorup-netizen.github.io/akdar-shabtoot-site/content/apk-latest.json',
];
const ALLOWED_PREFIXES = [
'https://github.com/akdargorup-netizen/akdar-shabtoot-site/',
'https://akdar-nine.vercel.app/',
'https://akdar-shabtoot.web.app/',
'https://akdargorup-netizen.github.io/akdar-shabtoot-site/',
];
const BANNER_ID = 'apk-update-banner';
const CHECK_KEY = 'akdar_apk_check_at_v1';
const DISMISS_KEY = 'akdar_apk_dismissed_code_v1';
const CHECK_EVERY_MS = 12 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const isNative = () => { try { return Boolean(window.Capacitor?.isNativePlatform?.()); } catch { return false; } };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {   } };
async function localCode() {
try {
const res = await fetch('./service-worker.js', { cache: 'no-store' });
const m = /CACHE_VERSION\s*=\s*['"]shabtoot-v(\d+)['"]/.exec((await res.text()).slice(0, 4000));
return m ? Number(m[1]) : 0;
} catch { return 0; }
}
function fetchJson(url) {
const ctl = new AbortController();
const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
return fetch(`${url}?t=${Math.floor(Date.now() / 600000)}`, { cache: 'no-store', mode: 'cors', credentials: 'omit', signal: ctl.signal })
.then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad-status'))))
.finally(() => clearTimeout(t));
}
function safeUrls(list) {
return (Array.isArray(list) ? list : [])
.filter((u) => typeof u === 'string' && ALLOWED_PREFIXES.some((p) => u.startsWith(p)));
}
async function orderByReach(urls) {
const probe = (u) => new Promise((resolve) => {
const ctl = new AbortController();
const tm = setTimeout(() => { ctl.abort(); resolve(false); }, 4000);
fetch(u, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: ctl.signal })
.then(() => { clearTimeout(tm); resolve(true); }, () => { clearTimeout(tm); resolve(false); });
});
try {
const ok = await Promise.all(urls.map(probe));
return [...urls.filter((_, i) => ok[i]), ...urls.filter((_, i) => !ok[i])];
} catch { return urls; }
}
function hide(banner) {
banner.classList.remove('update-banner--visible');
setTimeout(() => banner.remove(), 350);
}
function show({ code, msg, urls }) {
if (document.getElementById(BANNER_ID)) return;
const banner = document.createElement('div');
banner.id = BANNER_ID;
banner.className = 'update-banner';
banner.setAttribute('role', 'status');
banner.setAttribute('aria-live', 'polite');
banner.innerHTML = `
    <div class="update-banner__text">
      <strong class="update-banner__title">إصدار جديد من التطبيق</strong>
      <span class="update-banner__sub"></span>
    </div>
    <button type="button" class="update-banner__close" aria-label="لاحقًا">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
    <button type="button" class="update-banner__btn"><span class="update-banner__btn-label">حمّل الآن</span></button>
  `;
banner.querySelector('.update-banner__sub').textContent = String(msg || 'حمّل النسخة الأحدث ثم ثبّتها فوق القديمة').slice(0, 120);
document.body.appendChild(banner);
requestAnimationFrame(() => banner.classList.add('update-banner--visible'));
let i = 0;
banner.querySelector('.update-banner__btn').addEventListener('click', () => {
const url = urls[Math.min(i, urls.length - 1)];
i += 1;
try { window.open(url, '_blank', 'noopener'); } catch { location.href = url; }
if (i >= urls.length) banner.querySelector('.update-banner__btn-label').textContent = 'حمّل مرة أخرى';
});
banner.querySelector('.update-banner__close').addEventListener('click', () => {
lsSet(DISMISS_KEY, String(code));
hide(banner);
});
}
export async function checkApkUpdate() {
try {
if (!isNative()) return;
const last = Number(lsGet(CHECK_KEY) || 0);
if (Date.now() - last < CHECK_EVERY_MS) return;
if (navigator.onLine === false) return;
const remote = await Promise.any(REMOTE_URLS.map(fetchJson));
lsSet(CHECK_KEY, String(Date.now()));
const code = Number(remote?.code);
const urls = safeUrls(remote?.urls);
if (!Number.isFinite(code) || !urls.length) return;
if (Number(lsGet(DISMISS_KEY) || 0) >= code) return;
const mine = await localCode();
if (!mine || code <= mine) return;
show({ code, msg: remote.msg, urls: await orderByReach(urls) });
} catch {   }
}
