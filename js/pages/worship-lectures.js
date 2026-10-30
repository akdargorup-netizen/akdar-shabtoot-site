import { getWorshipLectures } from '../data/db.js';
import { thumb, ytLink } from '../core/youtube.js';
import { emptyState } from '../shared/empty-state.js';
import { escapeHtml } from '../shared/sanitize.js';
import { errorState, bindErrorRetry } from '../shared/error-state.js';
import { renderIcons } from '../shared/icons.js';
function renderCard(l) {
const link  = ytLink(l.youtubeId);
const title = escapeHtml(l.title);
return `
    <article class="voice-card">
      <a class="voice-media" href="${link}" target="_blank" rel="noopener">
        <div class="voice-cover">
          <img src="${thumb(l.youtubeId)}" alt="${title}" loading="lazy" />
          <div class="voice-overlay">
            <div class="voice-play voice-play--play"><span data-icon="play"></span></div>
          </div>
        </div>
      </a>
      <div class="voice-content">
        <h3 class="voice-title">${title}</h3>
        ${l.speaker ? `<div class="voice-meta"><span class="voice-narrator"><span data-icon="user"></span>${escapeHtml(l.speaker)}</span></div>` : ''}
        ${l.excerpt ? `<p class="voice-excerpt">${escapeHtml(l.excerpt)}</p>` : ''}
        <div class="voice-actions">
          <a class="listen-btn" href="${link}" target="_blank" rel="noopener">
            <span data-icon="play-circle"></span>
            شاهد المحاضرة
          </a>
          <button class="icon-btn share-btn" data-action="share-lecture" data-url="${link}" data-title="${title}">
            <span data-icon="share-2"></span>
          </button>
        </div>
      </div>
    </article>
  `;
}
function renderSkeleton(n = 3) {
return Array.from({ length: n }, () => `
    <article class="voice-card voice-card--skeleton" aria-hidden="true">
      <div class="page-skeleton__line page-skeleton__line--lg"></div>
      <div class="page-skeleton__line"></div>
      <div class="page-skeleton__line page-skeleton__line--md"></div>
    </article>
  `).join('');
}
export function renderWorshipLectures() {
return `
    <section class="page memory-sub-page worship-lectures-page">
      <section class="voice-feed" id="worship-lectures-feed">${renderSkeleton()}</section>
    </section>
  `;
}
export async function initWorshipLectures() {
const page = document.querySelector('.worship-lectures-page');
if (page) await _loadFeed(page);
}
async function _loadFeed(page) {
const feed = page.querySelector('#worship-lectures-feed');
if (!feed) return;
try {
const items = [...(await getWorshipLectures())].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
if (!items.length) {
feed.innerHTML = emptyState({
icon: 'headphones',
title: 'لسع ما في محاضرات منشورة',
desc: 'تابعنا هنا أول ما ننشر محاضرة جديدة.',
});
renderIcons();
return;
}
feed.innerHTML = items.map(renderCard).join('');
renderIcons();
feed.querySelectorAll('[data-action="share-lecture"]').forEach(btn => {
btn.addEventListener('click', () => {
const { url, title } = btn.dataset;
if (navigator.share) navigator.share({ title, url }).catch(() => {});
else navigator.clipboard?.writeText(url);
});
});
} catch (err) {
console.error('[WorshipLectures] فشل تحميل المحاضرات:', err);
feed.innerHTML = errorState({ subject: 'المحاضرات' });
renderIcons(feed);
bindErrorRetry(feed, () => _loadFeed(page));
}
}
