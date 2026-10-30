export const MIRROR_HOSTS = [
'https://akdar-nine.vercel.app/',
'https://akdar-shabtoot.web.app/',
'https://akdar-shabtoot.firebaseapp.com/',
'https://akdargorup-netizen.github.io/akdar-shabtoot-site/',
];
const STATE_KEY = 'akdar:hosts:v1';
const FAILS_TO_COOL = 2;
const COOL_MS = 5 * 60 * 1000;
const _norm = (u) => (u.endsWith('/') ? u : u + '/');
const CURRENT = _norm(new URL('../../', import.meta.url).href);
const IS_LOCAL = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(new URL(CURRENT).hostname);
let _state = null;
function _load() {
if (_state) return _state;
try { _state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}') || {}; } catch { _state = {}; }
return _state;
}
function _save() {
try { localStorage.setItem(STATE_KEY, JSON.stringify(_state)); } catch {   }
}
function _slot(base) {
const s = _load();
return (s[base] = s[base] || { f: 0, u: 0, ok: 0 });
}
function _markFail(base) {
if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
const s = _slot(base);
s.f += 1;
if (s.f >= FAILS_TO_COOL) s.u = Date.now() + COOL_MS;
_save();
}
function _markOk(base) {
const s = _slot(base);
s.f = 0; s.u = 0; s.ok = Date.now();
_save();
}
export function hostBases() {
if (IS_LOCAL) return [CURRENT];
const all = [...new Set([CURRENT, ...MIRROR_HOSTS.map(_norm)])];
const now = Date.now();
const healthy = all.filter((b) => _slot(b).u <= now);
const cooling = all.filter((b) => _slot(b).u > now).sort((a, b) => _slot(a).u - _slot(b).u);
return [...healthy, ...cooling];
}
export function hostStatus() {
const now = Date.now();
return hostBases().map((b) => {
const s = _slot(b);
return { base: b, current: b === CURRENT, fails: s.f, coolingMs: Math.max(0, s.u - now), lastOk: s.ok || null };
});
}
export function fetchStaticJson(rel, { timeoutMs = 8000, staggerMs = 2500, validate = null, init = {} } = {}) {
const bases = hostBases();
return new Promise((resolve) => {
let done = false, started = 0, failed = 0, timer = null;
const ctrls = [];
const finish = (val) => {
if (done) return;
done = true;
clearTimeout(timer);
ctrls.forEach((c) => { try { c.abort(); } catch {   } });
resolve(val);
};
const launch = () => {
clearTimeout(timer);
if (done || started >= bases.length) return;
attempt(bases[started++]);
if (started < bases.length) timer = setTimeout(launch, staggerMs);
};
const failOne = () => {
failed += 1;
if (failed >= bases.length) finish(null);
else if (started < bases.length) launch();
};
function attempt(base) {
const ctrl = new AbortController();
ctrls.push(ctrl);
const to = setTimeout(() => ctrl.abort(), timeoutMs);
fetch(new URL(rel, base), { cache: 'no-cache', ...init, signal: ctrl.signal })
.then(async (res) => {
if (done) return;
if (!res.ok) {
if (res.status >= 500 || res.status === 429) _markFail(base);
return failOne();
}
let data;
try { data = await res.json(); } catch { _markFail(base); return failOne(); }
if (done) return;
if (validate && !validate(data)) return failOne();
_markOk(base);
finish(data);
})
.catch(() => { if (!done) { _markFail(base); failOne(); } })
.finally(() => clearTimeout(to));
}
if (!bases.length) return finish(null);
launch();
});
}
const HF = 'hf';
const _hostOf = (b) => new URL(b).host;
function _probeBase(base, ms = 4000) {
return new Promise((resolve) => {
const ctl = new AbortController();
const t = setTimeout(() => { ctl.abort(); resolve(false); }, ms);
fetch(new URL('health.json?t=' + Date.now(), base), { cache: 'no-store', mode: 'cors', signal: ctl.signal })
.then((r) => (r.ok ? r.json() : null))
.then((j) => { clearTimeout(t); resolve(!!(j && j.ok === true && j.app === 'akdar')); })
.catch(() => { clearTimeout(t); resolve(false); });
});
}
async function _hostIsBroken() {
try {
const r = await fetch(new URL('service-worker.js?t=' + Date.now(), CURRENT), { cache: 'no-store' });
return !r.ok;
} catch { return navigator.onLine !== false; }
}
export async function initHostFailover() {
try {
if (IS_LOCAL || !('serviceWorker' in navigator)) return;
const q = new URLSearchParams(location.search);
const tried = new Set((q.get(HF) || '').split(',').filter(Boolean));
if (navigator.serviceWorker.controller) {
if (q.has(HF)) { q.delete(HF); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }
return;
}
const t0 = Date.now();
let sawWorker = false;
const verdict = await new Promise((resolve) => {
const tick = async () => {
if (navigator.serviceWorker.controller) return resolve('ok');
let reg = null;
try { reg = await navigator.serviceWorker.getRegistration(); } catch {   }
const w = reg && (reg.installing || reg.waiting || reg.active);
if (reg && reg.active && !reg.installing) return resolve('ok');
if (w) {
sawWorker = true;
if (reg.installing && !reg.installing._hf) {
reg.installing._hf = 1;
reg.installing.addEventListener('statechange', function () { if (this.state === 'redundant') resolve('failed'); });
}
} else if (Date.now() - t0 > (sawWorker ? 1500 : 12000)) return resolve('failed');
if (Date.now() - t0 > 120000) return resolve('slow');
setTimeout(tick, 1500);
};
setTimeout(tick, 3000);
});
if (verdict !== 'failed' || !(await _hostIsBroken())) return;
tried.add(_hostOf(CURRENT));
const rel = location.pathname.slice(new URL(CURRENT).pathname.length);
for (const base of MIRROR_HOSTS.map(_norm)) {
if (tried.has(_hostOf(base))) continue;
if (!(await _probeBase(base))) { tried.add(_hostOf(base)); continue; }
location.replace(new URL(rel, base).href.split('?')[0] + '?' + HF + '=' + [...tried].join(',') + location.hash);
return;
}
} catch {   }
}
