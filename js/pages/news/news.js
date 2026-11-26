import { getNews, getBreakingNews } from '../../data/db.js';
import { openReader }               from '../reader.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { emptyState } from '../../shared/empty-state.js';
import { fetchUrgentAnnouncement, renderUrgentBanner } from '../../shared/urgent-announcement.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { stripMarkup } from '../../shared/article-markup.js';
import { thumbImgAttrs } from '../../shared/image-thumb.js';
import { getNewIds, markSeen } from '../../shared/content-freshness.js';
import { renderIcons } from '../../shared/icons.js';
const PAGE_SIZE = 5;
let _allItems   = [];
let _page       = 1;
let _newIds     = new Set();
const _ICON_PREV = `<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
  <path d="M10.5 5.5L13.5 9L10.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4.5 9H13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
const _ICON_NEXT = `<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
  <path d="M7.5 5.5L4.5 9L7.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13.5 9H4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
export function renderNews() {
return `
    <section class="page news-page">

      <!-- Breaking News -->
      <section class="breaking-news" id="breaking-news-section">
        <div class="breaking-card breaking-card--skeleton">
        <div class="breaking-label">خبر عاجل</div>
          <div class="skeleton-line skeleton-line--lg"></div>
          <div class="skeleton-line"></div>
        </div>
      </section>

      <!-- News Feed — بدون فلاتر في الأعلى -->
      <section class="news-feed" id="news-feed">
        ${_renderSkeletonCards(3)}
      </section>

      <!-- ترقيم الصفحات -->
      <nav class="news-pagination" id="news-pagination" style="display:none" aria-label="ترقيم صفحات الأخبار"></nav>

    </section>
  `;
}
export async function initNews() {
_page = 1;
_bindFeedRefresh();
await Promise.all([_loadBreaking(), _loadFeed()]);
}
let _onRefreshed = null;
function _bindFeedRefresh() {
if (_onRefreshed) window.removeEventListener('akdar:data-refreshed', _onRefreshed);
const page = document.querySelector('.news-page');
_onRefreshed = (e) => {
if (!page?.isConnected) { window.removeEventListener('akdar:data-refreshed', _onRefreshed); _onRefreshed = null; return; }
if (e.detail?.collection !== 'news') return;
_loadFeed();
_refreshBreaking();
};
window.addEventListener('akdar:data-refreshed', _onRefreshed);
}
async function _loadBreaking() {
const section = document.getElementById('breaking-news-section');
if (!section) return;
const announcement = await fetchUrgentAnnouncement().catch(() => null);
const bannerHtml = announcement ? renderUrgentBanner(announcement, 'news') : '';
if (bannerHtml) {
section.innerHTML = bannerHtml;
renderIcons(section);
document.addEventListener('urgent-dismissed', () => _loadBreaking(), { once: true });
return;
}
await _renderBreaking(section);
}
async function _renderBreaking(section) {
try {
const item = await getBreakingNews();
section.innerHTML = item ? _renderBreakingCard(item) : '';
section.querySelector('[data-news-id]')
?.addEventListener('click', e => _openItem(e.currentTarget.dataset.newsId));
renderIcons();
} catch {
section.innerHTML = '';
}
}
async function _refreshBreaking() {
const section = document.getElementById('breaking-news-section');
if (!section || section.querySelector('.urgent-banner-wrap')) return;
await _renderBreaking(section);
}
async function _loadFeed() {
try {
_allItems = await getNews({ limit: 50 });
const fromSnapshot = _allItems.some(i => i.fromSnapshot);
_newIds = fromSnapshot ? new Set() : getNewIds('news', _allItems);
if (!fromSnapshot) markSeen('news', _allItems);
_renderPage();
} catch {
const feed = document.getElementById('news-feed');
if (feed) {
feed.innerHTML = errorState({ subject: 'الأخبار' });
renderIcons(feed);
bindErrorRetry(feed, _loadFeed);
}
}
}
function _renderPage() {
const feed = document.getElementById('news-feed');
if (!feed) return;
if (!_allItems.length) {
feed.innerHTML = emptyState({ icon: 'inbox', title: 'لسع ما في أخبار' });
renderIcons();
_hidePagination();
return;
}
const totalPages = Math.ceil(_allItems.length / PAGE_SIZE);
_page = Math.min(_page, totalPages);
const start = (_page - 1) * PAGE_SIZE;
const slice = _allItems.slice(start, start + PAGE_SIZE);
feed.innerHTML = slice.map(_renderNewsCard).join('');
feed.querySelectorAll('[data-news-id]').forEach(el => {
el.addEventListener('click', () => _openItem(el.dataset.newsId));
});
renderIcons();
_renderPagination(totalPages);
}
function _hidePagination() {
const pag = document.getElementById('news-pagination');
if (pag) pag.style.display = 'none';
}
function _buildPageNumbers(total) {
const delta = 1;
const pages = [];
for (let p = 1; p <= total; p++) {
const edge    = p === 1 || p === total;
const nearCur = Math.abs(p - _page) <= delta;
if (edge || nearCur) pages.push(p);
}
const withEllipsis = [];
let prev = 0;
for (const p of pages) {
if (prev && p - prev > 1) withEllipsis.push('…');
withEllipsis.push(p);
prev = p;
}
return withEllipsis;
}
function _renderPagination(totalPages) {
const pag = document.getElementById('news-pagination');
if (!pag) return;
if (totalPages <= 1) {
pag.style.display = 'none';
pag.innerHTML = '';
return;
}
pag.style.display = 'flex';
pag.innerHTML = `
    <button class="news-pagination__nav" id="news-prev" aria-label="الصفحة السابقة" ${_page <= 1 ? 'disabled' : ''}>
      ${_ICON_PREV}
    </button>
    <div class="news-pagination__numbers">
      ${_buildPageNumbers(totalPages).map(p => p === '…'
? `<span class="news-pagination__ellipsis">…</span>`
: `<button
             class="news-pagination__num${p === _page ? ' news-pagination__num--active' : ''}"
             data-page-num="${p}"
             ${p === _page ? 'aria-current="page"' : ''}
           >${p}</button>`
).join('')}
    </div>
    <button class="news-pagination__nav" id="news-next" aria-label="الصفحة التالية" ${_page >= totalPages ? 'disabled' : ''}>
      ${_ICON_NEXT}
    </button>
  `;
pag.querySelector('#news-prev')?.addEventListener('click', () => {
if (_page > 1) { _page--; _renderPage(); }
});
pag.querySelector('#news-next')?.addEventListener('click', () => {
if (_page < totalPages) { _page++; _renderPage(); }
});
pag.querySelectorAll('[data-page-num]').forEach(btn => {
btn.addEventListener('click', () => {
const n = Number(btn.dataset.pageNum);
if (n !== _page) { _page = n; _renderPage(); }
});
});
}
async function _openItem(id) {
const { getNewsItem } = await import('../../data/db.js');
const item = await getNewsItem(id);
if (item) openReader(item);
}
function _renderBreakingCard(item) {
return `
    <div class="breaking-card" data-news-id="${item.id}" style="cursor:pointer">
      <div class="breaking-label animate-breathe">خبر عاجل</div>
      <h2 class="breaking-title">${escapeHtml(item.title)}</h2>
      <p class="breaking-text">${escapeHtml(stripMarkup(item.body?.[0] || ''))}</p>
      <div class="breaking-meta">
        <span class="meta-item">${escapeHtml(item.date)}</span>
        <span class="meta-item">${escapeHtml(item.source)}</span>
      </div>
      <button class="primary-btn" data-news-id="${item.id}">قراءة المزيد</button>
    </div>
  `;
}
function _renderNewsCard(item) {
const categoryClass = item.categoryKey ? `news-card--${item.categoryKey}` : '';
const title = escapeHtml(item.title);
const isNew = _newIds.has(String(item.id));
const categoryChip = `<span class="news-category">${escapeHtml(item.category)}</span>`;
return `
    <article class="news-card ${categoryClass}" data-news-id="${item.id}" style="cursor:pointer">
      ${item.image ? `
        <div class="news-image">
          <img ${thumbImgAttrs(item.image)} alt="${title}" loading="lazy" />
          <span class="news-category news-category--overlay">${escapeHtml(item.category)}</span>
        </div>
      ` : ''}
      <div class="news-content">
        <div class="news-meta">
          ${isNew ? '<span class="content-new-badge">جديد</span>' : ''}
          ${item.image ? '' : categoryChip}
          <span class="news-time">${escapeHtml(item.date)}</span>
          ${item.source ? `<span class="news-source">${escapeHtml(item.source)}</span>` : ''}
        </div>
        <h3 class="news-title">${title}</h3>
        <p class="news-excerpt">${escapeHtml(stripMarkup(item.body?.[0] || ''))}</p>
        <button class="read-more" data-news-id="${item.id}">قراءة المزيد</button>
      </div>
    </article>
  `;
}
function _renderSkeletonCards(count) {
return Array.from({ length: count }, () => `
    <article class="news-card news-card--skeleton">
      <div class="news-image skeleton-block"></div>
      <div class="news-content">
        <div class="skeleton-line skeleton-line--sm"></div>
        <div class="skeleton-line skeleton-line--lg"></div>
        <div class="skeleton-line"></div>
      </div>
    </article>
  `).join('');
}
