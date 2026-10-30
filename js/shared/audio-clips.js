import { SUPABASE_URL } from '../data/supabase-client.js';
import { AUDIO_PREFIX, secondaryClipUrl, fetchObject } from '../data/storage-overflow.js';
export const CLIPS_CACHE = 'akdar-clips-v1';
const CLIPS_MAX_ENTRIES = 400;
const BUCKET_PATH = '/storage/v1/object/public/akdar-audio/';
const PATH_RE = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*\.(?:m4a|mp4|aac|mp3)$/;
let _audio = null;
let _objUrl = null;
let _btn = null;
let _token = 0;
export function isValidClipPath(path) {
return typeof path === 'string' && path.length < 160 && PATH_RE.test(path) && !path.includes('..');
}
export function clipUrl(path) {
if (path.startsWith(AUDIO_PREFIX)) return secondaryClipUrl(path);
return `${SUPABASE_URL}${BUCKET_PATH}${path}`;
}
function _setBtnState(btn, state) {
if (!btn) return;
btn.classList.toggle('is-loading', state === 'loading');
btn.classList.toggle('is-playing', state === 'playing');
btn.setAttribute('aria-pressed', state === 'playing' ? 'true' : 'false');
}
function _release() {
if (_audio) { try { _audio.pause(); } catch {   } _audio.removeAttribute('src'); _audio.load?.(); _audio = null; }
if (_objUrl) { URL.revokeObjectURL(_objUrl); _objUrl = null; }
_setBtnState(_btn, 'idle');
_btn = null;
}
export function stopClip() {
_token++;
_release();
}
async function _getBlob(path) {
const href = clipUrl(path);
let cache = null;
try { cache = await caches.open(CLIPS_CACHE); } catch {   }
if (cache) {
const hit = await cache.match(href).catch(() => null);
if (hit) return hit.blob();
}
if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
const res = await fetchObject(href, { mode: 'cors', credentials: 'omit' });
if (!res.ok) return null;
if (cache) {
const first = res.clone(), retry = res.clone();
try {
await cache.put(href, first);
} catch {
try {
const ks = await cache.keys();
await Promise.all(ks.slice(0, Math.max(10, Math.ceil(ks.length / 5))).map(k => cache.delete(k)));
await cache.put(href, retry);
} catch {   }
}
try {
const keys = await cache.keys();
if (keys.length > CLIPS_MAX_ENTRIES) {
await Promise.all(keys.slice(0, keys.length - CLIPS_MAX_ENTRIES).map(k => cache.delete(k)));
}
} catch {   }
}
return res.blob();
}
export function prefetchClip(path) {
if (!isValidClipPath(path)) return;
_getBlob(path).catch(() => {});
}
async function _toast(msg) {
try { (await import('./toast.js')).showToast(msg, 'info', 2600); } catch {   }
}
export async function playClip(path, btn = null) {
if (!isValidClipPath(path)) return;
if (btn && btn === _btn && btn.classList.contains('is-playing')) { stopClip(); return; }
stopClip();
const my = ++_token;
_btn = btn;
_setBtnState(btn, 'loading');
try {
const blob = await _getBlob(path);
if (my !== _token) return;
if (!blob) {
_release();
_toast('الصوت يحتاج نت أول مرة');
return;
}
_objUrl = URL.createObjectURL(blob);
_audio = new Audio(_objUrl);
_audio.preload = 'auto';
_audio.addEventListener('ended', () => { if (my === _token) _release(); });
_audio.addEventListener('error', () => { if (my === _token) { _release(); _toast('تعذّر تشغيل المقطع'); } });
await _audio.play();
if (my === _token) _setBtnState(btn, 'playing');
} catch (err) {
if (my !== _token) return;
_release();
if (err?.name !== 'AbortError') _toast(navigator.onLine === false ? 'الصوت يحتاج نت أول مرة' : 'تعذّر تشغيل المقطع');
}
}
const _ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';
export function clipButtonHtml(path, label = 'استمع للنطق') {
if (!isValidClipPath(path)) return '';
return `<button type="button" class="clip-btn" data-clip="${path}" aria-label="${label}" aria-pressed="false"><span class="clip-btn__icon">${_ICON}</span><span class="clip-btn__label" aria-hidden="true"><span class="clip-btn__t clip-btn__t--idle">استمع</span><span class="clip-btn__t clip-btn__t--on">إيقاف</span></span></button>`;
}
export function clipOffHtml() {
return `<span class="clip-btn clip-btn--off" role="img" aria-label="لا يوجد تسجيل صوتي" title="لا يوجد تسجيل صوتي"><span class="clip-btn__icon">${_ICON}</span><span class="clip-btn__label" aria-hidden="true"><span class="clip-btn__t clip-btn__t--idle">لا صوت</span></span></span>`;
}
export function bindClipButtons(root) {
if (!root || root.__clipBound) return;
root.__clipBound = true;
root.addEventListener('click', (e) => {
const btn = e.target.closest?.('.clip-btn[data-clip]');
if (!btn || !root.contains(btn)) return;
e.preventDefault();
e.stopPropagation();
playClip(btn.dataset.clip, btn);
});
}
