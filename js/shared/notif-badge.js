import { getUnreadNotificationsCount } from '../data/db.js';
import { waitForAuthReady, onAuthChange } from '../data/auth.js';
export async function refreshNotifBadge({ fresh = false } = {}) {
try {
const count = await getUnreadNotificationsCount({ fresh });
setNotifBadge(count);
} catch (err) {
console.error('[NotifBadge] فشل التحديث:', err);
}
}
export function setNotifBadge(count) {
const el = document.getElementById('notif-badge-count');
if (!el) return;
if (!count || count <= 0) {
el.classList.remove('is-visible', 'animate-breathe');
el.textContent = '';
return;
}
el.textContent = count > 99 ? '99+' : String(count);
el.classList.add('is-visible', 'animate-breathe');
}
let _autoBound = false;
let _lastFresh = 0;
let _debounce = null;
function _scheduleRefresh(opts) {
clearTimeout(_debounce);
_debounce = setTimeout(() => refreshNotifBadge(opts), 250);
}
function _refreshFreshThrottled() {
const now = Date.now();
if (now - _lastFresh < 60000) return;
_lastFresh = now;
_scheduleRefresh({ fresh: true });
}
function _bindAutoRefresh() {
if (_autoBound || typeof window === 'undefined') return;
_autoBound = true;
window.addEventListener('akdar:data-refreshed', (e) => {
if (e.detail?.collection !== 'notifications') return;
if (document.getElementById('notifications-feed')) return;
_scheduleRefresh();
});
waitForAuthReady().then(() => _scheduleRefresh()).catch(() => {});
let first = true;
onAuthChange(() => {
if (first) { first = false; return; }
_scheduleRefresh({ fresh: true });
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) _refreshFreshThrottled(); });
window.addEventListener('online', _refreshFreshThrottled);
}
_bindAutoRefresh();
