import { getEvents } from '../../data/db.js';
import { EVENT_CATEGORIES } from '../../data/videos-events-data.js';
import { thumb, ytLink } from '../../core/youtube.js';
import { emptyState, syncFilterEmpty } from '../../shared/empty-state.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { renderIcons } from '../../shared/icons.js';
import { markSeen } from '../../shared/content-freshness.js';
function renderEventCard(ev) {
const link = ytLink(ev.youtubeId);
const title = escapeHtml(ev.title);
return `
    <article class="event-card" data-category="${escapeHtml(ev.category)}">

      <a class="event-media" href="${link}" target="_blank" rel="noopener">
        <div class="event-thumbnail">
          <img src="${thumb(ev.youtubeId)}" alt="${title}" loading="lazy" />
          <div class="play-overlay">
            <span data-icon="play"></span>
          </div>
          <span class="media-chip ${escapeHtml(ev.category)}">${escapeHtml(ev.label)}</span>
        </div>
      </a>

      <div class="event-content">
        <h3 class="event-title">${title}</h3>
        ${ev.date ? `<div class="event-meta"><span class="event-time">${escapeHtml(ev.date)}</span></div>` : ''}
        ${ev.excerpt ? `<p class="event-excerpt">${escapeHtml(ev.excerpt)}</p>` : ''}
        <div class="event-actions">
          <a class="watch-btn" href="${link}" target="_blank" rel="noopener"><span data-icon="play"></span>شاهد</a>
          <div class="event-actions-icons">
            <button class="icon-btn share-btn" data-action="share-event" data-url="${link}" data-title="${title}">
              <span data-icon="share-2"></span>
            </button>
          </div>
        </div>
      </div>

    </article>
  `;
}
function renderFilters() {
return EVENT_CATEGORIES.map((cat, i) => `
    <button class="filter-chip${i === 0 ? ' active' : ''}" data-filter="${cat.key}">${cat.label}</button>
  `).join('');
}
function renderSkeletonCards(n = 3) {
return Array.from({ length: n }, () => `
    <article class="event-card event-card--skeleton" aria-hidden="true">
      <!-- يحاكي البطاقة الحقيقية: صورة الفيديو، تصنيف+تاريخ، العنوان، النبذة، زر المشاهدة -->
      <div class="page-skeleton__thumb"></div>
      <div class="page-skeleton__row">
        <div class="page-skeleton__pill page-skeleton__pill--tag"></div>
        <div class="page-skeleton__line page-skeleton__line--sm" style="width:24%"></div>
      </div>
      <div class="page-skeleton__line page-skeleton__line--lg"></div>
      <div class="page-skeleton__line"></div>
      <div class="page-skeleton__actions">
        <div class="page-skeleton__pill"></div>
        <div class="page-skeleton__pill page-skeleton__pill--icon"></div>
      </div>
    </article>
  `).join('');
}
export function renderEvents() {
return `
    <section class="page events-page">
      <div class="events-filters">${renderFilters()}</div>
      <section class="events-feed" id="events-feed">${renderSkeletonCards()}</section>
    </section>
  `;
}
export async function initEvents() {
const page = document.querySelector('.events-page');
if (!page) return;
page.querySelectorAll('.filter-chip').forEach(btn => {
btn.addEventListener('click', () => {
page.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
btn.classList.add('active');
const filter = btn.dataset.filter;
page.querySelectorAll('.event-card').forEach(card => {
card.hidden = filter !== 'all' && card.dataset.category !== filter;
});
if (syncFilterEmpty(page.querySelector('#events-feed'), '.event-card:not(.event-card--skeleton)', {
title: 'ما في مناسبات في التصنيف دا',
desc: 'جرّب تصنيف تاني أو اختر "الكل".',
})) renderIcons();
});
});
_bindFeedRefresh(page);
await _loadFeed(page);
}
let _onRefreshed = null;
function _bindFeedRefresh(page) {
if (_onRefreshed) window.removeEventListener('akdar:data-refreshed', _onRefreshed);
_onRefreshed = (e) => {
if (!page.isConnected) { window.removeEventListener('akdar:data-refreshed', _onRefreshed); _onRefreshed = null; return; }
if (e.detail?.collection === 'events') _loadFeed(page);
};
window.addEventListener('akdar:data-refreshed', _onRefreshed);
}
async function _loadFeed(page) {
const feed = page.querySelector('#events-feed');
if (!feed) return;
try {
const items = [...(await getEvents())].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
if (!items.length) {
feed.innerHTML = emptyState({
icon: 'video-off',
title: 'لسع ما في مناسبات',
desc: 'تابعنا هنا أول ما ننشر فيديو مناسبة جديدة.',
});
renderIcons();
return;
}
feed.innerHTML = items.map(renderEventCard).join('');
const active = page.querySelector('.filter-chip.active')?.dataset.filter;
if (active && active !== 'all') {
feed.querySelectorAll('.event-card').forEach(card => { card.hidden = card.dataset.category !== active; });
syncFilterEmpty(feed, '.event-card:not(.event-card--skeleton)', {
title: 'ما في مناسبات في التصنيف دا',
desc: 'جرّب تصنيف تاني أو اختر "الكل".',
});
}
renderIcons();
if (!items.some(i => i.fromSnapshot)) markSeen('events', items);
_bindShareButtons(feed);
} catch (err) {
console.error('[Events] فشل تحميل المناسبات:', err);
feed.innerHTML = errorState({ subject: 'المناسبات' });
renderIcons(feed);
bindErrorRetry(feed, () => _loadFeed(page));
}
}
function _bindShareButtons(feed) {
feed.querySelectorAll('[data-action="share-event"]').forEach(btn => {
btn.addEventListener('click', () => {
const { url, title } = btn.dataset;
if (navigator.share) {
navigator.share({ title, url }).catch(() => {});
} else {
navigator.clipboard?.writeText(url);
}
});
});
}
