import { getSupabase }       from '../supabase-client.js';
import { fetchStaticJson }   from '../hosts.js';
import { ensureSession }  from '../auth.js';
import { cacheGet, cachePut, cacheMarkStale } from '../read-cache.js';
import { isRead as _isReadReq, assertReadAllowed, noteOutcome } from './rate-guard.js';
import { stampKeyFor, ttlFor, stampsReady, stampsLive, onStampsChanged, adoptMirrorStamp } from '../cache-stamps.js';
export const _READ_TIMEOUT_MS  = 15000;
export const _WRITE_TIMEOUT_MS = 25000;
export const _offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
export const _isSlowNet = () => {
try {
const c = navigator.connection;
if (!c) return false;
if (c.saveData === true) return true;
if (/(^|-)[23]g$/.test(c.effectiveType || '')) return true;
if (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 1.5) return true;
if (typeof c.rtt === 'number' && c.rtt > 700) return true;
return false;
} catch { return false; }
};
const _ttl = (ms) => ms * (_isSlowNet() ? 5 : 1);
export async function _sbWrite() {
const sb = await getSupabase();
await Promise.race([ensureSession(), new Promise(r => setTimeout(r, 8000))]);
return sb;
}
export const _sbRead = () => getSupabase();
export async function _run(builder, ms = _READ_TIMEOUT_MS) {
if (_offline()) throw Object.assign(new Error('offline'), { code: 'offline' });
const isRead = _isReadReq(builder);
if (isRead) assertReadAllowed();
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), ms);
try {
const res = await builder.abortSignal(ctrl.signal);
if (isRead && res) noteOutcome({ status: res.status, error: res.error });
return res;
} catch (err) {
if (ctrl.signal.aborted) {
const te = Object.assign(new Error('timeout'), { code: 'timeout' });
if (isRead) noteOutcome({ error: te });
throw te;
}
if (isRead) noteOutcome({ error: err });
throw err;
} finally {
clearTimeout(timer);
}
}
export function _fail(error) {
const code = String(error?.code || '');
if (code === '42501' || /row-level security|permission denied/i.test(String(error?.message || ''))) {
throw Object.assign(new Error('ما عندك صلاحية لهذا الإجراء — تأكد إنك مسجّل دخول بحساب الإدارة'), { code: code || '42501' });
}
if (code === '23503') throw Object.assign(new Error('المحتوى دا ما عاد موجود'), { code });
throw error instanceof Error ? error : Object.assign(new Error(String(error?.message || 'حصل خطأ غير متوقع')), { code });
}
const _MIRROR_TIMEOUT_MS = 8000;
const _mirrors = new Map();
let _mirrorStamp = null;
const _tableOk = (d) => d?.version === 1 && Array.isArray(d.rows) && d.rows.length > 0;
const _stampOk = (d) => d?.v === 1 && d.stamps && typeof d.stamps === 'object';
function _mirrorJson(file, validate) {
return fetchStaticJson(`content/mirror/${file}`, { timeoutMs: _MIRROR_TIMEOUT_MS, validate });
}
function _mirrorFile(table) {
if (!_mirrors.has(table)) {
_mirrors.set(table, _mirrorJson(`${encodeURIComponent(table)}.json`, _tableOk).then((data) => {
if (!(data?.version === 1 && Array.isArray(data.rows) && data.rows.length)) { _mirrors.delete(table); return null; }
return { rows: data.rows, exportedAt: Date.parse(data.exportedAt) || 0 };
}));
}
return _mirrors.get(table);
}
function _mirrorStampFile() {
if (!_mirrorStamp) {
_mirrorStamp = _mirrorJson('_stamp.json', _stampOk).then((data) => {
const checkedAt = Date.parse(data?.checkedAt);
if (!(data?.v === 1 && data.stamps && typeof data.stamps === 'object' && checkedAt > 0)) { _mirrorStamp = null; return null; }
return { stamps: data.stamps, checkedAt };
});
}
return _mirrorStamp;
}
export async function mirrorRows(table, { asc = false } = {}) {
const m = await _mirrorFile(table);
if (!m) return null;
const dir = asc ? 1 : -1;
const cmp = (a, b) => (String(a.created_at || '') < String(b.created_at || '') ? -1 : String(a.created_at || '') > String(b.created_at || '') ? 1 : 0);
return m.rows.slice().sort((a, b) => dir * (cmp(a, b) || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0)));
}
export const mirrorSeed = (table, opts) => Promise.race([mirrorRows(table, opts), new Promise((r) => setTimeout(() => r(null), 6000))]);
export async function mirrorIsCurrent(table) {
const [file, st] = await Promise.all([_mirrorFile(table), _mirrorStampFile()]);
if (!file || !st || !(file.exportedAt >= st.checkedAt)) return false;
return adoptMirrorStamp(table, st.stamps[table]);
}
const _inflight = new Map();
const _revalidating = new Set();
let _writeEpoch = 0;
const _loaders = new Map();
function _announce(collection, id) {
try { window.dispatchEvent(new CustomEvent('akdar:data-refreshed', { detail: { collection, id } })); }
catch {   }
}
function _dedupe(key, fetcher) {
if (_inflight.has(key)) return _inflight.get(key);
const p = Promise.resolve().then(fetcher).finally(() => _inflight.delete(key));
_inflight.set(key, p);
return p;
}
function _revalidate(key, fetcher, prev, collection) {
if (_revalidating.has(key) || _offline()) return;
_revalidating.add(key);
const epoch = _writeEpoch;
_dedupe(key, fetcher)
.then((next) => {
if (epoch !== _writeEpoch) return;
cachePut(key, next);
if (JSON.stringify(next) !== JSON.stringify(prev)) _announce(collection);
})
.catch(() => {   })
.finally(() => _revalidating.delete(key));
}
export async function _rows(key, fetcher, { collection, ttlMs = 60000, fresh = false, seed, seedCurrent, fallback } = {}) {
const stamped = Boolean(stampKeyFor(key));
if (stamped) { await stampsReady(); _loaders.set(key, { fetcher, collection }); }
if (!fresh) {
const hit = await cacheGet(key);
if (hit) {
if (!(stamped && stampsLive()) && Array.isArray(hit.value) && hit.value.length === 0 && Date.now() - hit.savedAt >= 30000 && !_offline()) {
const epoch = _writeEpoch;
const fetchP = _dedupe(key, fetcher).then((value) => {
cachePut(key, value, epoch === _writeEpoch ? Date.now() : 0);
return value;
});
return Promise.race([
fetchP.catch(() => hit.value),
new Promise((resolve) => setTimeout(() => resolve(hit.value), 4000)),
]);
}
if (Date.now() - hit.savedAt >= ttlFor(key, _ttl(ttlMs))) _revalidate(key, fetcher, hit.value, collection);
return hit.value;
}
if (seed) {
let snap = null;
try { snap = await seed(); } catch {   }
if (Array.isArray(snap) && snap.length) {
let current = false;
if (stamped && seedCurrent) { try { current = await seedCurrent(); } catch {   } }
cachePut(key, snap, current ? Date.now() : 0);
if (!current) _revalidate(key, fetcher, snap, collection);
return snap;
}
}
}
const epoch = _writeEpoch;
let value;
try {
value = await _dedupe(key, fetcher);
} catch (err) {
if (fallback && !fresh) {
let snap = null;
try { snap = await fallback(); } catch {   }
if (Array.isArray(snap) && snap.length) { cachePut(key, snap, 0); return snap; }
}
throw err;
}
cachePut(key, value, epoch === _writeEpoch ? Date.now() : 0);
return value;
}
export function _reconcile(...prefixes) {
_writeEpoch++;
prefixes.forEach((p) => cacheMarkStale(p).catch(() => {}));
}
export async function _patch(key, mutator) {
_writeEpoch++;
const e = await cacheGet(key);
if (!e) return;
try { await cachePut(key, mutator(Array.isArray(e.value) ? e.value.slice() : e.value), e.savedAt); }
catch {   }
}
onStampsChanged(async (changed) => {
for (const [key, { fetcher, collection }] of _loaders) {
if (!changed.has(stampKeyFor(key))) continue;
const hit = await cacheGet(key);
_revalidate(key, fetcher, hit?.value, collection);
}
});
