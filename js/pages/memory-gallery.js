import { getGalleryItems }             from '../data/db.js';
import { GALLERY_CATEGORIES }          from '../data/gallery-data.js';
import { emptyState }                  from '../shared/empty-state.js';
import { thumbImgAttrs }               from '../shared/image-thumb.js';
import { errorState, bindErrorRetry }  from '../shared/error-state.js';
import { renderIcons }                 from '../shared/icons.js';
import { escapeHtml }                  from '../shared/sanitize.js';
import { toArabicDigits }              from '../shared/arabic-digits.js';
import { setBackInterceptor }         from '../core/router.js';
let _items       = [];
let _activeIndex = -1;
const EXCERPT_CLAMP_CHARS = 110;
export function renderMemoryGallery() {
return `
    <section class="page memory-sub-page">

      <div class="gallery-filters" id="gallery-filters" style="display:none;"></div>

      <section class="gallery-grid" id="gallery-grid">
        ${_renderSkeletons(6)}
      </section>

    </section>
  `;
}
export async function initMemoryGallery() {
const grid = document.getElementById('gallery-grid');
if (!grid) return;
try {
_items = await getGalleryItems();
_items = [..._items].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
_renderFilters();
_renderGrid();
} catch (err) {
console.error('[MemoryGallery] فشل تحميل الصور:', err);
grid.innerHTML = errorState({ subject: 'صور البلد' });
renderIcons(grid);
bindErrorRetry(grid, initMemoryGallery);
}
}
function _renderFilters() {
const bar = document.getElementById('gallery-filters');
if (!bar) return;
const usedKeys = new Set(_items.map(i => i.category));
const cats = GALLERY_CATEGORIES.filter(c => usedKeys.has(c.key));
if (cats.length < 2) {
bar.style.display = 'none';
bar.innerHTML = '';
return;
}
bar.style.display = 'flex';
bar.innerHTML = `
    <button class="filter-chip active" data-cat="all">الكل</button>
    ${cats.map(c => `<button class="filter-chip" data-cat="${c.key}">${c.label}</button>`).join('')}
  `;
bar.querySelectorAll('.filter-chip').forEach(chip => {
chip.addEventListener('click', () => {
bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
chip.classList.add('active');
_renderGrid(chip.dataset.cat === 'all' ? null : chip.dataset.cat);
});
});
}
function _renderGrid(categoryFilter = null) {
const grid = document.getElementById('gallery-grid');
if (!grid) return;
const visible = categoryFilter
? _items.filter(i => i.category === categoryFilter)
: _items;
if (!visible.length) {
grid.classList.remove('gallery-grid--fade');
grid.innerHTML = emptyState({
icon:  'image-off',
title: 'لسع ما في صور',
desc:  'أول ما تتضاف صور للمعرض حتظهر هنا.',
});
renderIcons();
return;
}
grid.innerHTML = visible.map((item, i) => _renderTile(item, i)).join('');
grid.classList.add('gallery-grid--fade');
renderIcons();
grid.querySelectorAll('[data-gallery-index]').forEach(tile => {
tile.addEventListener('click', () => {
_openLightbox(visible, Number(tile.dataset.galleryIndex));
});
});
}
function _renderTile(item, index) {
const label = GALLERY_CATEGORIES.find(c => c.key === item.category)?.label || item.category;
const title = escapeHtml(item.title);
return `
    <button class="gallery-tile" data-gallery-index="${index}" aria-label="${title}">
      ${item.image
? `<img ${thumbImgAttrs(item.image)} alt="${title}" loading="lazy">`
: `<span class="gallery-tile__placeholder"><i data-lucide="image"></i></span>`
}
      <span class="gallery-tile__overlay">
        <span class="gallery-tile__category">${escapeHtml(label)}</span>
        <span class="gallery-tile__title">${title}</span>
      </span>
    </button>
  `;
}
function _renderSkeletons(count) {
return Array.from({ length: count }, () => `<div class="gallery-tile gallery-tile--skeleton skeleton-block"></div>`).join('');
}
function _openLightbox(list, index) {
_activeIndex = index;
let overlay = document.getElementById('gallery-lightbox');
if (!overlay) {
overlay = document.createElement('div');
overlay.id = 'gallery-lightbox';
overlay.className = 'gallery-lightbox';
document.body.appendChild(overlay);
}
const render = () => {
const item = list[_activeIndex];
if (!item) return;
const label = GALLERY_CATEGORIES.find(c => c.key === item.category)?.label || item.category;
const title = escapeHtml(item.title);
const isLong = (item.excerpt || '').length > EXCERPT_CLAMP_CHARS;
overlay.innerHTML = `
      <button class="gallery-lightbox__close" data-action="close" aria-label="إغلاق">
        <i data-lucide="x"></i>
      </button>
      <button class="gallery-lightbox__zoom" data-action="zoom" aria-label="تكبير الصورة">
        <i data-lucide="zoom-in"></i>
      </button>
      <div class="gallery-lightbox__viewport">
        ${list.length > 1 ? `
          <button class="gallery-lightbox__nav gallery-lightbox__nav--prev" data-action="prev" aria-label="السابقة">
            <i data-lucide="chevron-right"></i>
          </button>
          <button class="gallery-lightbox__nav gallery-lightbox__nav--next" data-action="next" aria-label="التالية">
            <i data-lucide="chevron-left"></i>
          </button>
        ` : ''}
        <div class="gallery-lightbox__stage">
          ${item.image
? `<img src="${escapeHtml(item.image)}" alt="${title}" loading="lazy" decoding="async">`
: `<span class="gallery-tile__placeholder"><i data-lucide="image"></i></span>`
}
        </div>
      </div>
      <div class="gallery-lightbox__caption">
        <div class="gallery-lightbox__meta">
          <span class="gallery-lightbox__category">${escapeHtml(label)}</span>
          ${list.length > 1 ? `<span class="gallery-lightbox__dot" aria-hidden="true"></span><span class="gallery-lightbox__count">${toArabicDigits(_activeIndex + 1)} من ${toArabicDigits(list.length)}</span>` : ''}
        </div>
        <h3 class="gallery-lightbox__title">${title}</h3>
        ${item.excerpt ? `
          <div class="gallery-lightbox__body">
            <p class="gallery-lightbox__excerpt${isLong ? ' is-clamped' : ''}">${escapeHtml(item.excerpt)}</p>
            ${isLong ? `<button type="button" class="gallery-lightbox__more" data-action="more">عرض المزيد</button>` : ''}
          </div>` : ''}
        ${item.source ? `<p class="gallery-lightbox__source"><span class="gallery-lightbox__source-label">المصدر</span>${escapeHtml(item.source)}</p>` : ''}
      </div>
    `;
renderIcons(overlay);
overlay.querySelector('[data-action="close"]')?.addEventListener('click', _closeLightbox);
overlay.querySelector('[data-action="prev"]')?.addEventListener('click', () => _step(list, -1, render));
overlay.querySelector('[data-action="next"]')?.addEventListener('click', () => _step(list, 1, render));
overlay.querySelector('[data-action="more"]')?.addEventListener('click', (e) => {
const ex = overlay.querySelector('.gallery-lightbox__excerpt');
const open = ex.classList.toggle('is-clamped') === false;
e.currentTarget.textContent = open ? 'عرض أقل' : 'عرض المزيد';
});
const stage = overlay.querySelector('.gallery-lightbox__stage');
overlay.classList.remove('is-zoomed');
if (stage) {
const zoom = _attachSwipe(stage, list, render, overlay);
overlay.querySelector('[data-action="zoom"]')?.addEventListener('click', () => zoom.toggle());
}
};
if (!overlay.__bound) {
overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeLightbox(); });
overlay.__bound = true;
}
document.addEventListener('keydown', _onLightboxKeydown);
setBackInterceptor(() => {
const o = document.getElementById('gallery-lightbox');
if (o && o.classList.contains('is-open')) { _closeLightbox(); return true; }
setBackInterceptor(null);
return false;
});
render();
requestAnimationFrame(() => overlay.classList.add('is-open'));
function _keyNav(e) {
if (e.key === 'ArrowLeft')  _step(list, 1, render);
if (e.key === 'ArrowRight') _step(list, -1, render);
}
overlay.__keyNav = _keyNav;
document.addEventListener('keydown', _keyNav);
}
function _step(list, delta, render) {
_activeIndex = (_activeIndex + delta + list.length) % list.length;
render();
}
function _attachSwipe(stageEl, list, render, overlay) {
const THRESHOLD = 70;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const img = stageEl.querySelector('img');
let scale = 1, tx = 0, ty = 0;
let startX = 0, startY = 0, deltaX = 0, dragging = false, axis = null;
let panStart = null;
let pinch = null;
let lastTap = { t: 0, x: 0, y: 0 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const centre = () => { const r = stageEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
function limits() {
if (!img) return { x: 0, y: 0 };
return {
x: Math.max(0, (img.clientWidth  * scale - stageEl.clientWidth)  / 2),
y: Math.max(0, (img.clientHeight * scale - stageEl.clientHeight) / 2),
};
}
function apply(animate = false) {
if (!img) return;
const l = limits();
tx = clamp(tx, -l.x, l.x);
ty = clamp(ty, -l.y, l.y);
img.style.transition = animate ? 'transform var(--duration-base) var(--ease-out)' : 'none';
img.style.transform = scale === 1 ? '' : `translate(${tx}px, ${ty}px) scale(${scale})`;
const zoomed = scale > 1.02;
overlay.classList.toggle('is-zoomed', zoomed);
const btn = overlay.querySelector('[data-action="zoom"]');
if (btn) {
btn.setAttribute('aria-label', zoomed ? 'إرجاع الحجم' : 'تكبير الصورة');
const icon = btn.querySelector('[data-lucide], svg');
if (icon && btn.dataset.state !== (zoomed ? 'out' : 'in')) {
btn.dataset.state = zoomed ? 'out' : 'in';
btn.innerHTML = `<i data-lucide="${zoomed ? 'zoom-out' : 'zoom-in'}"></i>`;
renderIcons(btn);
}
}
}
function zoomAt(newScale, px, py, animate = false) {
const c = centre();
const ns = clamp(newScale, 1, MAX_SCALE);
const mx = px - c.x, my = py - c.y;
tx = mx - (mx - tx) * (ns / scale);
ty = my - (my - ty) * (ns / scale);
scale = ns;
if (scale === 1) { tx = 0; ty = 0; }
apply(animate);
}
const toggle = () => {
const c = centre();
zoomAt(scale > 1.02 ? 1 : DOUBLE_TAP_SCALE, c.x, c.y, true);
};
const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
const mid  = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
function onStart(e) {
if (e.touches.length === 2) {
dragging = false; panStart = null; axis = null;
stageEl.style.transition = 'none'; stageEl.style.transform = ''; stageEl.style.opacity = '';
const m = mid(e.touches);
pinch = { dist: dist(e.touches), scale, tx, ty, cx: m.x, cy: m.y };
return;
}
const t = e.touches[0];
if (scale > 1.02) {
panStart = { x: t.clientX, y: t.clientY, tx, ty };
return;
}
startX = t.clientX; startY = t.clientY;
deltaX = 0; dragging = true; axis = null;
stageEl.style.transition = 'none';
}
function onMove(e) {
if (pinch && e.touches.length === 2) {
e.preventDefault();
const m = mid(e.touches);
const ns = clamp(pinch.scale * (dist(e.touches) / pinch.dist), 1, MAX_SCALE);
const c = centre();
const ox = pinch.cx - c.x, oy = pinch.cy - c.y;
tx = (m.x - c.x) - (ox - pinch.tx) * (ns / pinch.scale);
ty = (m.y - c.y) - (oy - pinch.ty) * (ns / pinch.scale);
scale = ns;
apply();
return;
}
if (panStart && e.touches.length === 1) {
e.preventDefault();
const t = e.touches[0];
tx = panStart.tx + (t.clientX - panStart.x);
ty = panStart.ty + (t.clientY - panStart.y);
apply();
return;
}
if (!dragging || e.touches.length !== 1) return;
const t = e.touches[0];
const dx = t.clientX - startX;
const dy = t.clientY - startY;
if (!axis) {
if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
if (axis === 'y') { dragging = false; return; }
}
if (axis !== 'x') return;
e.preventDefault();
deltaX = dx;
stageEl.style.transform = `translateX(${deltaX}px)`;
stageEl.style.opacity = String(Math.max(0.55, 1 - Math.abs(deltaX) / 500));
}
function onEnd(e) {
if (pinch) {
if (e.touches.length < 2) {
pinch = null;
if (scale < 1.05) { scale = 1; tx = 0; ty = 0; apply(true); }
if (e.touches.length === 1 && scale > 1.02) {
const t = e.touches[0];
panStart = { x: t.clientX, y: t.clientY, tx, ty };
}
}
return;
}
if (e.changedTouches && e.changedTouches.length === 1 && e.touches.length === 0) {
const t = e.changedTouches[0];
const moved = Math.hypot(t.clientX - (panStart ? panStart.x : startX), t.clientY - (panStart ? panStart.y : startY));
if (moved < 10) {
const now = Date.now();
if (now - lastTap.t < 300 && Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < 30) {
lastTap = { t: 0, x: 0, y: 0 };
panStart = null; dragging = false;
stageEl.style.transform = ''; stageEl.style.opacity = '';
zoomAt(scale > 1.02 ? 1 : DOUBLE_TAP_SCALE, t.clientX, t.clientY, true);
return;
}
lastTap = { t: now, x: t.clientX, y: t.clientY };
}
}
if (panStart) { panStart = null; return; }
if (!dragging) return;
dragging = false;
if (axis !== 'x') return;
if (list.length > 1 && Math.abs(deltaX) > THRESHOLD) {
_step(list, deltaX < 0 ? 1 : -1, render);
} else {
stageEl.style.transition = 'transform var(--duration-base) var(--ease-out), opacity var(--duration-base) var(--ease-out)';
stageEl.style.transform = '';
stageEl.style.opacity = '';
}
}
stageEl.addEventListener('touchstart', onStart, { passive: true });
stageEl.addEventListener('touchmove', onMove, { passive: false });
stageEl.addEventListener('touchend', onEnd);
stageEl.addEventListener('touchcancel', onEnd);
stageEl.addEventListener('wheel', (e) => {
e.preventDefault();
zoomAt(scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
}, { passive: false });
stageEl.addEventListener('dblclick', (e) => zoomAt(scale > 1.02 ? 1 : DOUBLE_TAP_SCALE, e.clientX, e.clientY, true));
let mouse = null;
stageEl.addEventListener('mousedown', (e) => { if (scale > 1.02) mouse = { x: e.clientX, y: e.clientY, tx, ty }; });
window.addEventListener('mousemove', function onMouse(e) {
if (!stageEl.isConnected) { window.removeEventListener('mousemove', onMouse); return; }
if (!mouse) return;
tx = mouse.tx + (e.clientX - mouse.x);
ty = mouse.ty + (e.clientY - mouse.y);
apply();
});
window.addEventListener('mouseup', () => { mouse = null; });
return { toggle };
}
function _onLightboxKeydown(e) {
const overlay = document.getElementById('gallery-lightbox');
if (!overlay || !overlay.classList.contains('is-open')) return;
if (e.key === 'Escape') _closeLightbox();
}
function _closeLightbox() {
const overlay = document.getElementById('gallery-lightbox');
if (!overlay) return;
overlay.classList.remove('is-open');
setBackInterceptor(null);
document.removeEventListener('keydown', _onLightboxKeydown);
if (overlay.__keyNav) document.removeEventListener('keydown', overlay.__keyNav);
setTimeout(() => overlay.remove(), 200);
}
