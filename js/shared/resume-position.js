const KEY_PREFIX = 'sbb:resume:';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 60;
const MIN_TOP    = 120;
export const RESUME_PAGES = new Set([
'history-articles',
'events',
'student-videos-intermediate',
'student-videos-secondary',
]);
let _armed = false;
let _timer = null;
export const isResumePage = (page) => RESUME_PAGES.has(page);
function _filterIsAll(container) {
const f = container.querySelector('.filter-chip.active')?.dataset.filter;
return !f || f === 'all';
}
export function saveResume(page, container) {
if (!_armed || !isResumePage(page) || !container) return;
try {
const top = Math.round(container.scrollTop);
if (top < MIN_TOP || !_filterIsAll(container)) {
localStorage.removeItem(KEY_PREFIX + page);
return;
}
localStorage.setItem(KEY_PREFIX + page, JSON.stringify({ top, t: Date.now() }));
} catch (_) {   }
}
export function readResume(page) {
if (!isResumePage(page)) return null;
try {
const raw = JSON.parse(localStorage.getItem(KEY_PREFIX + page) || 'null');
if (!raw || typeof raw.top !== 'number' || raw.top < MIN_TOP) return null;
if (Date.now() - (raw.t || 0) > MAX_AGE_MS) return null;
return raw.top;
} catch (_) { return null; }
}
export function disarmResume() {
_armed = false;
clearTimeout(_timer);
}
export function armResume() {
_armed = true;
}
export function bindResume(container) {
if (!container || container.__resumeBound) return;
container.__resumeBound = true;
const cur = () => container.dataset.currentPage;
container.addEventListener('scroll', () => {
if (!_armed || !isResumePage(cur())) return;
clearTimeout(_timer);
_timer = setTimeout(() => saveResume(cur(), container), 250);
}, { passive: true });
const flush = () => { clearTimeout(_timer); saveResume(cur(), container); };
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
window.addEventListener('pagehide', flush);
}
