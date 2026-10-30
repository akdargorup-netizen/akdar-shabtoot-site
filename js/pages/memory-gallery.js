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
if (stage) _attachSwipe(stage, list, render);
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
function _attachSwipe(stageEl, list, render) {
const THRESHOLD = 70;
let startX = 0;
let startY = 0;
let deltaX = 0;
let dragging = false;
let axis = null;
function onStart(e) {
const t = e.touches ? e.touches[0] : e;
startX = t.clientX;
startY = t.clientY;
deltaX = 0;
dragging = true;
axis = null;
stageEl.style.transition = 'none';
}
function onMove(e) {
if (!dragging) return;
const t = e.touches ? e.touches[0] : e;
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
function onEnd() {
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
