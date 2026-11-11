import { getSupabase } from './supabase-client.js';
import { cacheGet, cachePut, cacheMarkStale } from './read-cache.js';
import { assertReadAllowed, noteOutcome } from './adapters/rate-guard.js';
export const STAMP_ROW_KEY = 'cache_stamps';
export const STAMP_CAP_MS = 6 * 3600 * 1000;
const STORE_KEY = 'stamps:last';
const FIRST_DELAY_MS = 1200;
const MIN_GAP_MS = 120000;
const INTERVAL_MS = 600000;
const TIMEOUT_MS = 8000;
const LIBRARY = [
'memory_videos', 'study_videos', 'study_tips', 'worship_lectures', 'history_articles',
'association_journey_articles', 'projects', 'gallery', 'contacts',
'nubian_words', 'nubian_phrase_categories', 'nubian_phrases',
];
const PUBLIC = ['news', 'events', 'ideas', 'occasions'];
export const STAMPED = new Set([...PUBLIC, ...LIBRARY]);
const RECENT = new Set(PUBLIC);
export function stampKeyFor(cacheKey) {
const parts = String(cacheKey).split(':');
const head = parts[0];
if (head === 'recent') return RECENT.has(parts[1]) ? parts[1] : null;
if (!STAMPED.has(head)) return null;
const kind = parts[1] || '';
if (!(kind.startsWith('rows') || kind === 'one' || kind === 'latest')) return null;
if (kind === 'rowsAll' || parts.includes('all') || parts[parts.length - 1] === 'admin') return null;
return head;
}
const _prefixesOf = (k) => [`${k}:rows`, `${k}:one:`, `${k}:latest`, `recent:${k}`];
let _live = false;
let _prev = null;
const _adopted = new Map();
let _ready = null;
let _last = 0;
let _running = false;
const _handlers = new Set();
export const stampsLive = () => _live;
export function ttlFor(cacheKey, normalMs) {
return _live && stampKeyFor(cacheKey) ? STAMP_CAP_MS : normalMs;
}
export function onStampsChanged(fn) { _handlers.add(fn); }
async function _fetchStamps() {
assertReadAllowed();
const sb = await getSupabase();
const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
try {
const res = await sb.from('settings').select('data').eq('key', STAMP_ROW_KEY).maybeSingle().abortSignal(ctrl.signal);
if (res) noteOutcome({ status: res.status, error: res.error });
if (!res || res.error) return null;
const d = res.data?.data;
return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
} catch (err) {
noteOutcome({ error: err });
return null;
} finally {
clearTimeout(t);
}
}
export async function checkStamps({ force = false } = {}) {
if (_running) return;
if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
if (!force && Date.now() - _last < MIN_GAP_MS) return;
_running = true;
try {
let s;
try { s = await _fetchStamps(); } catch { return; }
_last = Date.now();
if (!s) return;
const changed = new Set([...STAMPED].filter((k) => {
if (_prev) return String(s[k]) !== String(_prev[k]);
return !_adopted.has(k) || String(s[k]) !== String(_adopted.get(k));
}));
_live = true;
if (changed.size) {
for (const k of changed) for (const p of _prefixesOf(k)) { try { await cacheMarkStale(p); } catch {   } }
await Promise.all([..._handlers].map(async (h) => { try { await h(changed); } catch {   } }));
}
_prev = s;
_adopted.clear();
try { await cachePut(STORE_KEY, s); } catch {   }
} finally {
_running = false;
}
}
export function adoptMirrorStamp(section, stamp) {
if (!STAMPED.has(section) || stamp === undefined || stamp === null) return false;
const norm = Number(stamp) > 0 ? stamp : undefined;
if (_prev) return String(_prev[section]) === String(norm);
_adopted.set(section, norm);
return true;
}
export function stampsReady() {
if (_ready) return _ready;
_ready = (async () => {
try {
const e = await cacheGet(STORE_KEY);
if (e?.value && typeof e.value === 'object') { _prev = e.value; _live = true; }
} catch {   }
if (typeof window === 'undefined' || typeof document === 'undefined') return;
setTimeout(() => { checkStamps({ force: true }); }, FIRST_DELAY_MS + Math.random() * 3000);
const _soon = () => setTimeout(() => { checkStamps(); }, Math.random() * 4000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) _soon(); });
window.addEventListener('online', _soon);
setInterval(() => { if (!document.hidden) checkStamps(); }, INTERVAL_MS);
})();
return _ready;
}
export function _resetForTests() { _live = false; _prev = null; _ready = null; _last = 0; _running = false; _handlers.clear(); _adopted.clear(); }
