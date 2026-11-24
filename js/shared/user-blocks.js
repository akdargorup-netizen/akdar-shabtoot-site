const KEY = 'akdar_blocked_users_v1';
const MAX_BLOCKED = 200;
function _read() {
try {
const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
return Array.isArray(raw) ? raw.filter(x => x && typeof x.uid === 'string') : [];
} catch { return []; }
}
function _write(list) {
try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_BLOCKED))); } catch {   }
}
export function getBlockedUsers() { return _read(); }
export function isBlocked(uid) {
if (!uid) return false;
return _read().some(x => x.uid === uid);
}
export function blockUser(uid, name = '') {
if (!uid) return;
const list = _read().filter(x => x.uid !== uid);
list.push({ uid, name: String(name || '').slice(0, 60), at: Date.now() });
_write(list);
applyBlocks();
}
export function unblockUser(uid) {
_write(_read().filter(x => x.uid !== uid));
document.querySelectorAll('[data-blocked-hidden="1"]').forEach(el => {
if (el.dataset.itemOwner === uid) {
el.style.removeProperty('display');
el.removeAttribute('data-blocked-hidden');
el.hidden = false;
}
});
}
export function applyBlocks(root = document) {
const list = _read();
if (!list.length || !root?.querySelectorAll) return;
const set = new Set(list.map(x => x.uid));
root.querySelectorAll('[data-item-owner]').forEach(el => {
const owner = el.dataset.itemOwner;
if (owner && set.has(owner) && el.dataset.blockedHidden !== '1') {
el.dataset.blockedHidden = '1';
el.hidden = true;
el.style.display = 'none';
}
});
}
let _installed = false;
export function installBlockFilter() {
if (_installed || typeof MutationObserver === 'undefined') return;
_installed = true;
let queued = false;
const run = () => { queued = false; applyBlocks(); };
new MutationObserver(() => {
if (queued || !_read().length) return;
queued = true;
requestAnimationFrame(run);
}).observe(document.body, { childList: true, subtree: true });
applyBlocks();
}
