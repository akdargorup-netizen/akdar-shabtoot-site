const KB_MIN_PX        = 100;
const EDGE_GAP_PX      = 12;
const SYNC_DELAYS_MS   = [120, 320];
const NO_SIGNAL_MS     = 600;
const FALLBACK_RATIO   = 0.45;
const INPUT_DEBOUNCE_MS = 100;
const BLUR_GRACE_MS    = 200;
const _root = document.documentElement;
const _vv   = window.visualViewport || null;
let _baseH        = window.innerHeight;
let _field        = null;
let _fallbackOn   = false;
let _raf          = 0;
let _noSignalTimer = 0;
let _blurTimer    = 0;
let _inputTimer   = 0;
let _syncTimers   = [];
function _isTextEntry(el) {
if (!el || el.nodeType !== 1) return false;
if (el.isContentEditable) return true;
if (el.tagName === 'TEXTAREA') return true;
if (el.tagName !== 'INPUT') return false;
return !/^(button|submit|reset|checkbox|radio|range|file|color|image|hidden)$/i.test(el.type);
}
const _isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
function _measure() {
const scale = _vv ? _vv.scale : 1;
if (_vv && scale > 1.01) {
return { shrunk: 0, covered: 0, visTop: 0, visBottom: window.innerHeight };
}
const layoutH   = window.innerHeight;
const visTop    = _vv ? _vv.offsetTop : 0;
const visH      = _vv ? _vv.height : layoutH;
const visBottom = visTop + visH;
return {
shrunk:  _baseH - visH,
covered: Math.max(0, layoutH - visBottom),
visTop,
visBottom,
};
}
function _apply(open, covered) {
_root.style.setProperty('--kb-inset', `${Math.round(covered)}px`);
document.body.classList.toggle('kb-open', open);
}
function _scrollParent(el) {
for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
const oy = getComputedStyle(p).overflowY;
if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
}
return el.closest('.modal, .app-content');
}
function _reveal() {
if (!_field || !_field.isConnected) return;
const sc = _scrollParent(_field);
if (!sc) return;
const m   = _measure();
const box = sc.getBoundingClientRect();
const top    = Math.max(box.top, m.visTop) + EDGE_GAP_PX;
const bottom = Math.min(box.bottom, m.visBottom) - EDGE_GAP_PX;
const r = _field.getBoundingClientRect();
let dy = 0;
if (r.top < top) {
dy = r.top - top;
} else if (r.bottom > bottom) {
dy = Math.min(r.bottom - bottom, r.top - top);
}
if (Math.abs(dy) > 1) sc.scrollBy({ top: dy });
}
function _release() {
clearTimeout(_noSignalTimer);
clearTimeout(_blurTimer);
clearTimeout(_inputTimer);
_syncTimers.forEach(clearTimeout);
_syncTimers = [];
_field = null;
_fallbackOn = false;
_apply(false, 0);
}
function _sync() {
if (!_field || !_field.isConnected) { _release(); return; }
const m = _measure();
if (m.shrunk > KB_MIN_PX) {
clearTimeout(_noSignalTimer);
_fallbackOn = false;
_apply(true, m.covered);
_reveal();
} else if (!_fallbackOn) {
_apply(false, 0);
}
}
function _arm(field) {
clearTimeout(_blurTimer);
clearTimeout(_noSignalTimer);
_syncTimers.forEach(clearTimeout);
_field = field;
_sync();
_syncTimers = SYNC_DELAYS_MS.map(ms => setTimeout(_sync, ms));
if (!_isTouchDevice()) return;
_noSignalTimer = setTimeout(() => {
if (!_field || !_field.isConnected) return;
if (_measure().shrunk > KB_MIN_PX) return;
_fallbackOn = true;
_apply(true, Math.round(window.innerHeight * FALLBACK_RATIO));
_reveal();
}, NO_SIGNAL_MS);
}
function _onFocusIn(e) {
if (_isTextEntry(e.target)) _arm(e.target);
}
function _onPointerUp(e) {
if (_isTextEntry(e.target) && e.target === document.activeElement && e.target === _field) _arm(e.target);
}
function _onFocusOut(e) {
if (e.target !== _field) return;
clearTimeout(_blurTimer);
_blurTimer = setTimeout(() => {
if (_isTextEntry(document.activeElement)) return;
_release();
}, BLUR_GRACE_MS);
}
function _onInput(e) {
if (e.target !== _field) return;
clearTimeout(_inputTimer);
_inputTimer = setTimeout(() => {
if (document.body.classList.contains('kb-open')) _reveal();
}, INPUT_DEBOUNCE_MS);
}
function _onViewportChange() {
if (!_field) {
_baseH = Math.max(window.innerHeight, _vv ? _vv.height * (_vv.scale || 1) : 0);
return;
}
cancelAnimationFrame(_raf);
_raf = requestAnimationFrame(_sync);
}
function _validate() {
if (_field && !_field.isConnected) _release();
}
export function initKeyboardScroll() {
document.addEventListener('focusin',  _onFocusIn);
document.addEventListener('focusout', _onFocusOut);
document.addEventListener('input',    _onInput, true);
document.addEventListener('pointerup', _onPointerUp, true);
document.addEventListener('pointerdown', () => setTimeout(_validate, 350), true);
window.addEventListener('hashchange', () => setTimeout(_validate, 300));
window.addEventListener('popstate',   () => setTimeout(_validate, 300));
window.addEventListener('resize', _onViewportChange);
window.addEventListener('orientationchange', () => {
setTimeout(() => { if (!_field) _baseH = window.innerHeight; }, 350);
});
if (_vv) {
_vv.addEventListener('resize', _onViewportChange);
_vv.addEventListener('scroll', _onViewportChange);
}
}
