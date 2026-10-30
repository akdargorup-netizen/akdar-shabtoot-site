const OFFLINE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round">
  <line x1="1" y1="1" x2="23" y2="23"/>
  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
  <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
  <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
  <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
  <circle cx="12" cy="20" r="1"/>
</svg>`;
const THUMB_SELECTOR = '.event-thumbnail, .voice-cover, .reader-linked-event__thumb';
const _failed = new Set();
export function initImages(container = document) {
container.querySelectorAll('img').forEach(guardImage);
}
function guardImage(img) {
if (img.dataset.imgHandled) return;
img.dataset.imgHandled = '1';
if (!img.hasAttribute('loading')) {
img.setAttribute('loading', 'lazy');
}
if (img.complete) {
const cur = img.currentSrc || img.src || '';
if (img.naturalWidth === 0 && img.getAttribute('src') && !/\.svg(\?|#|$)|^data:image\/svg/i.test(cur)) {
handleBrokenImage(img);
}
return;
}
img.classList.add('img--loading');
img.addEventListener('load', () => img.classList.remove('img--loading'), { once: true });
}
function handleBrokenImage(img) {
if (img.dataset.imgFailed) return;
img.dataset.imgFailed = '1';
img.classList.remove('img--loading');
const label = navigator.onLine ? 'الصورة ما اتحملت' : 'يحتاج نت';
const box = img.closest(THUMB_SELECTOR);
if (box) {
img.classList.add('img--failed');
let fb = box.querySelector(':scope > .thumb-fallback');
if (!fb) {
fb = document.createElement('div');
fb.className = 'thumb-fallback';
fb.setAttribute('aria-hidden', 'true');
fb.innerHTML = `
        <span class="thumb-fallback__icon">${OFFLINE_SVG}</span>
        <span class="thumb-fallback__label">${label}</span>`;
box.prepend(fb);
} else {
const l = fb.querySelector('.thumb-fallback__label');
if (l) l.textContent = label;
}
box.classList.add('thumb--failed');
_failed.add({ img, box, holder: fb });
return;
}
const wrapper = document.createElement('div');
wrapper.className = 'img-placeholder';
wrapper.setAttribute('aria-label', label);
wrapper.setAttribute('role', 'img');
wrapper.innerHTML = `
    <span class="img-placeholder__icon">${OFFLINE_SVG}</span>
    <span class="img-placeholder__label">${label}</span>
  `;
if (img.width)  wrapper.style.width  = img.width  + 'px';
if (img.height) wrapper.style.height = img.height + 'px';
img.replaceWith(wrapper);
_failed.add({ img, box: null, holder: wrapper });
}
function retryFailedImages() {
_failed.forEach(entry => {
const { img, box, holder } = entry;
const anchor = box || holder;
if (!anchor || !anchor.isConnected) { _failed.delete(entry); return; }
const src = img.getAttribute('src');
if (!src) { _failed.delete(entry); return; }
delete img.dataset.imgFailed;
if (box) _failed.delete(entry);
img.addEventListener('load', () => {
if (box) {
img.classList.remove('img--failed');
box.classList.remove('thumb--failed');
holder?.remove();
} else if (holder?.isConnected) {
holder.replaceWith(img);
}
_failed.delete(entry);
}, { once: true });
if (!box && holder?.isConnected) {
img.addEventListener('error', () => _failed.delete(entry), { once: true });
}
img.src = src;
});
}
(function installGlobalImageGuard() {
if (typeof document === 'undefined' || window.__imgGuardInstalled) return;
window.__imgGuardInstalled = true;
document.addEventListener('error', (e) => {
const t = e.target;
if (t && t.tagName === 'IMG') {
if (!t.dataset.imgHandled) t.dataset.imgHandled = '1';
handleBrokenImage(t);
}
}, true);
const scan = (node) => {
if (node.nodeType !== 1) return;
if (node.tagName === 'IMG') guardImage(node);
else if (node.firstElementChild) node.querySelectorAll('img').forEach(guardImage);
};
new MutationObserver((muts) => {
for (const m of muts) m.addedNodes.forEach(scan);
}).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('online', () => setTimeout(retryFailedImages, 600));
})();
