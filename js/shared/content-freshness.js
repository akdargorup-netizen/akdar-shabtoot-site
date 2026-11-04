const _STORAGE_PREFIX = 'akdar_seen_';
const _MAX_TRACKED_IDS = 300;
function _key(section) {
return _STORAGE_PREFIX + section;
}
function _readSeen(section) {
try {
const raw = localStorage.getItem(_key(section));
return raw ? new Set(JSON.parse(raw)) : null;
} catch {
return null;
}
}
function _writeSeen(section, ids) {
try {
const capped = ids.slice(-_MAX_TRACKED_IDS);
localStorage.setItem(_key(section), JSON.stringify(capped));
} catch {
}
}
export function getNewIds(section, items) {
const seen = _readSeen(section);
if (!seen) return new Set();
return new Set(items.filter(it => !seen.has(String(it.id))).map(it => String(it.id)));
}
export function markSeen(section, items) {
_writeSeen(section, items.map(it => String(it.id)));
try { window.dispatchEvent(new CustomEvent(SEEN_EVENT, { detail: { section } })); } catch {   }
}
export const SEEN_EVENT = 'akdar-content-seen';
export function countNewIds(section, ids) {
const seen = _readSeen(section);
if (!seen) return 0;
return ids.reduce((n, id) => n + (seen.has(String(id)) ? 0 : 1), 0);
}
export function seedIfFirstVisit(section, ids) {
if (_readSeen(section)) return;
_writeSeen(section, ids.map(String));
}
