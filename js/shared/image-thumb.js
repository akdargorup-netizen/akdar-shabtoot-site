import { escapeHtml } from './sanitize.js';
const THUMB_EPOCH = 1792088511608;
const _RE = /^(https:\/\/[^/]+\/storage\/v1\/object\/public\/akdar-images\/(?:[a-zA-Z0-9_-]+\/)*(\d{13})-[0-9a-f]{12})\.(webp|jpg|png)$/;
export function thumbUrl(url) {
const m = typeof url === 'string' ? _RE.exec(url) : null;
if (!m || Number(m[2]) < THUMB_EPOCH) return url;
return `${m[1]}_t.${m[3]}`;
}
export function thumbImgAttrs(url) {
const t = thumbUrl(url);
return t === url
? `src="${escapeHtml(url)}"`
: `src="${escapeHtml(t)}" data-full-src="${escapeHtml(url)}"`;
}
if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__akdarThumbFallback) {
window.__akdarThumbFallback = true;
document.addEventListener('error', (e) => {
const img = e.target;
if (!img || img.tagName !== 'IMG') return;
const full = img.getAttribute('data-full-src');
if (!full) return;
img.removeAttribute('data-full-src');
img.src = full;
}, true);
}
