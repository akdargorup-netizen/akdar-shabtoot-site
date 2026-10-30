const KEY = 'akdar:rate-guard';
const BASE_MS = 2 * 60 * 1000;
const MAX_MS  = 10 * 60 * 1000;
let _until = 0;
let _level = 0;
let _softLevel = 0;
let _serverFails = 0;
let _slowFails = 0;
const SOFT_BASE_MS = 30 * 1000;
const SOFT_MAX_MS  = 5 * 60 * 1000;
const SERVER_FAILS_TO_TRIP = 3;
const SLOW_FAILS_TO_TRIP = 4;
const _jitter = (ms) => Math.random() * Math.min(30000, ms * 0.25);
try {
const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
if (saved && Number(saved.until) > Date.now()) { _until = Number(saved.until); _level = Number(saved.level) || 0; _softLevel = Number(saved.soft) || 0; if (!_level && !_softLevel) _level = 1; }
} catch {   }
function _persist() {
try { sessionStorage.setItem(KEY, JSON.stringify({ until: _until, level: _level, soft: _softLevel })); } catch {   }
}
export function isRead(builder) {
const m = String(builder?.method || 'GET').toUpperCase();
return m === 'GET' || m === 'HEAD';
}
export function isTripped() {
return Date.now() < _until;
}
export function retryInMs() {
return Math.max(0, _until - Date.now());
}
export function assertReadAllowed() {
if (Date.now() < _until) throw Object.assign(new Error('rate-limited'), { code: 'rate-limited' });
}
function _limitHit(status, error) {
const st = Number(status || error?.status || 0);
if (st === 429 || st === 402) return true;
const code = String(error?.code || '');
if (code === '429') return true;
return /too many requests|rate.?limit|exceed.*(quota|limit)|quota.*exceed/i.test(String(error?.message || ''));
}
function _announceTrip() {
try { window.dispatchEvent(new CustomEvent('akdar:rate-limited', { detail: { until: _until } })); } catch {   }
}
function _isServerFail(status, error) {
const st = Number(status || error?.status || 0);
return st >= 500 && st <= 599;
}
function _isSlowFail(error) {
if (!error) return false;
if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
const code = String(error.code || '');
const msg = String(error.message || '');
return error.name === 'AbortError' || code === 'timeout' || msg === 'timeout' || /failed to fetch|network ?error|load failed/i.test(msg);
}
function _softTrip() {
_softLevel = Math.min(_softLevel + 1, 6);
const base = Math.min(SOFT_BASE_MS * 2 ** (_softLevel - 1), SOFT_MAX_MS);
_until = Math.max(_until, Date.now() + base + _jitter(base));
_serverFails = 0; _slowFails = 0;
_persist();
_announceTrip();
}
export function noteOutcome({ status, error } = {}) {
if (_limitHit(status, error)) {
_level = Math.min(_level + 1, 6);
const base = Math.min(BASE_MS * 2 ** (_level - 1), MAX_MS);
_until = Date.now() + base + _jitter(base);
_serverFails = 0; _slowFails = 0;
_persist();
_announceTrip();
return true;
}
if (_isServerFail(status, error)) {
_slowFails = 0;
if (++_serverFails >= SERVER_FAILS_TO_TRIP) { _softTrip(); return true; }
return false;
}
if (_isSlowFail(error)) {
if (++_slowFails >= SLOW_FAILS_TO_TRIP) { _softTrip(); return true; }
return false;
}
if (!error) {
_serverFails = 0; _slowFails = 0;
if (_level || _softLevel) { _level = 0; _softLevel = 0; _until = 0; _persist(); }
}
return false;
}
