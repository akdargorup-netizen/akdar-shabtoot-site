const REMOTE_URLS = [
'https://akdar-shabtoot.web.app/content/ota-latest.json',
'https://akdar-nine.vercel.app/content/ota-latest.json',
'https://akdargorup-netizen.github.io/akdar-shabtoot-site/content/ota-latest.json',
];
const ALLOWED_PREFIXES = [
'https://github.com/akdargorup-netizen/akdar-shabtoot-site/',
'https://akdar-nine.vercel.app/',
'https://akdar-shabtoot.web.app/',
'https://akdargorup-netizen.github.io/akdar-shabtoot-site/',
];
const CHECK_KEY = 'akdar_ota_check_at_v1';
const BAD_KEY = 'akdar_ota_bad_v2';
const RETRY_BAD_MS = 3 * 60 * 60 * 1000;
const SEEN_KEY = 'akdar_ota_seen_code_v1';
const LAST_KEY = 'akdar_ota_last_v1';
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const plugin = () => { try { return window.Capacitor?.Plugins?.CapacitorUpdater || null; } catch { return null; } };
const isNative = () => { try { return Boolean(window.Capacitor?.isNativePlatform?.()); } catch { return false; } };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {   } };
async function bundleCode() {
try {
const res = await fetch('./service-worker.js', { cache: 'no-store' });
const m = /CACHE_VERSION\s*=\s*['"]shabtoot-v(\d+)['"]/.exec((await res.text()).slice(0, 4000));
return m ? Number(m[1]) : 0;
} catch { return 0; }
}
async function nativeCode() {
try {
const info = await window.Capacitor?.Plugins?.App?.getInfo?.();
const n = Number(info?.build);
return Number.isFinite(n) ? n : 0;
} catch { return 0; }
}
function fetchJson(url) {
const ctl = new AbortController();
const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
return fetch(`${url}?t=${Math.floor(Date.now() / 600000)}`, { cache: 'no-store', mode: 'cors', credentials: 'omit', signal: ctl.signal })
.then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad-status'))))
.finally(() => clearTimeout(t));
}
const HEDGE_MS = 3000;
function firstOk(urls) {
return new Promise((resolve, reject) => {
let started = 0, failed = 0, inflight = 0, done = false, timer = null;
const startNext = () => {
if (done || started >= urls.length) return;
const u = urls[started++];
inflight += 1;
clearTimeout(timer);
if (started < urls.length) timer = setTimeout(startNext, HEDGE_MS);
fetchJson(u).then(
(v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } },
() => {
inflight -= 1; failed += 1;
if (failed >= urls.length) { done = true; clearTimeout(timer); reject(new Error('all-hosts-failed')); }
else if (inflight === 0) startNext();
},
);
};
startNext();
});
}
const safeUrls = (list) => (Array.isArray(list) ? list : [])
.filter((u) => typeof u === 'string' && ALLOWED_PREFIXES.some((p) => u.startsWith(p)));
async function cleanup(P, keepIds) {
try {
const { bundles } = await P.list();
for (const b of bundles || []) {
if (!b?.id || b.id === 'builtin' || keepIds.includes(b.id)) continue;
await P.delete({ id: b.id }).catch(() => {});
}
} catch {   }
}
export async function initOta() {
try {
if (!isNative()) return;
const P = plugin();
if (!P) return;
await P.notifyAppReady();
announceIfUpdated().catch(() => {});
setTimeout(() => { checkOta(P).catch(() => {}); }, 8000);
} catch {   }
}
async function announceIfUpdated() {
const now = await bundleCode();
if (!now) return;
const seen = Number(lsGet(SEEN_KEY) || 0);
lsSet(SEEN_KEY, String(now));
if (!seen || now <= seen) return;
const { showToast } = await import('./toast.js');
showToast('تم تحديث التطبيق ✓', 'success', 3500);
}
async function checkOta(P) {
if (Date.now() - Number(lsGet(CHECK_KEY) || 0) < CHECK_EVERY_MS) return;
if (navigator.onLine === false) return;
if (navigator.connection?.saveData) return;
const remote = await firstOk(REMOTE_URLS);
lsSet(CHECK_KEY, String(Date.now()));
const code = Number(remote?.bundle);
const urls = safeUrls(remote?.urls);
if (!Number.isFinite(code) || !urls.length) return;
const sha = String(remote?.sha256 || '');
try {
const bad = JSON.parse(lsGet(BAD_KEY) || 'null');
if (bad && bad.code === code && bad.sha === sha && Date.now() - Number(bad.at || 0) < RETRY_BAD_MS) return;
} catch {   }
const [mine, native] = await Promise.all([bundleCode(), nativeCode()]);
if (!mine || code <= mine) return;
if (Number(remote?.minApk) > native) return;
let lastErr = '';
for (const url of urls) {
try {
const b = await P.download({
url,
version: String(code),
...(remote?.sha256 ? { checksum: String(remote.sha256) } : {}),
});
if (!b?.id) continue;
await P.next({ id: b.id });
lsSet(LAST_KEY, JSON.stringify({ code, ok: true, at: Date.now() }));
const cur = await P.current().catch(() => null);
await cleanup(P, [b.id, cur?.bundle?.id].filter(Boolean));
return;
} catch (e) { lastErr = String(e?.message || e).slice(0, 80);   }
}
lsSet(LAST_KEY, JSON.stringify({ code, ok: false, err: lastErr, at: Date.now() }));
lsSet(BAD_KEY, JSON.stringify({ code, sha, at: Date.now() }));
}
