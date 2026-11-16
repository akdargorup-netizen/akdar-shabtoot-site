import { fetchStaticJson } from './hosts.js';
const KEY = 'akdar:rc:v1';
const REFRESH_MS = 15 * 60 * 1000;
const DOWN_MS = 5 * 60 * 1000;
export const DEFAULT_ASK_ENDPOINT = 'https://rtgrkugcokqxseedzunr.supabase.co/functions/v1/ask';
const ASK_ALLOW = [
/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/ask$/,
/^https:\/\/[a-z0-9-]+\.vercel\.app\/api\/ask$/,
];
const MEDIA_SUPABASE_MODES = new Set(['auto', 'off']);
const DEFAULTS = { v: 0, ask: { endpoints: [DEFAULT_ASK_ENDPOINT] }, media: { supabase: 'auto' } };
export function sanitize(raw) {
if (!raw || typeof raw !== 'object' || typeof raw.v !== 'number') return null;
const eps = Array.isArray(raw.ask?.endpoints)
? raw.ask.endpoints.filter((u) => typeof u === 'string' && ASK_ALLOW.some((re) => re.test(u)))
: [];
const sb = raw.media?.supabase;
return {
v: raw.v,
ask: { endpoints: [...new Set(eps)] },
media: { supabase: MEDIA_SUPABASE_MODES.has(sb) ? sb : 'auto' },
};
}
let _cfg = null;
function _readStore() {
try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch { return {}; }
}
function _writeStore(o) {
try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {   }
}
function _current() {
if (_cfg) return _cfg;
_cfg = sanitize(_readStore().cfg) || DEFAULTS;
return _cfg;
}
export function getRemoteConfig() { return _current(); }
export async function refreshRemoteConfig({ force = false } = {}) {
try {
const st = _readStore();
if (!force && st.ts && Date.now() - st.ts < REFRESH_MS) return _current();
const raw = await fetchStaticJson('content/remote-config.json', {
timeoutMs: 4000, staggerMs: 1500, validate: (d) => !!sanitize(d),
});
const clean = sanitize(raw);
if (!clean) return _current();
if (st.cfg && typeof st.cfg.v === 'number' && clean.v < st.cfg.v) { _writeStore({ ...st, ts: Date.now() }); return _current(); }
_cfg = clean;
_writeStore({ cfg: clean, ts: Date.now() });
} catch {   }
return _current();
}
const _down = new Map();
export function askEndpoints() {
const list = [...new Set([..._current().ask.endpoints, DEFAULT_ASK_ENDPOINT])];
const now = Date.now();
return [
...list.filter((u) => (_down.get(u) || 0) <= now),
...list.filter((u) => (_down.get(u) || 0) > now),
];
}
export function markAskDown(url) { _down.set(url, Date.now() + DOWN_MS); }
export function markAskUp(url) { _down.delete(url); }
