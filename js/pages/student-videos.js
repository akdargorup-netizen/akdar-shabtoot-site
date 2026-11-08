import { getStudyVideos } from '../data/db.js';
import { stageLabel } from '../data/study-data.js';
import { thumb, ytLink } from '../core/youtube.js';
import { emptyState } from '../shared/empty-state.js';
import { escapeHtml } from '../shared/sanitize.js';
import { errorState, bindErrorRetry } from '../shared/error-state.js';
import { renderIcons } from '../shared/icons.js';
function renderVideoCard(v) {
const link  = ytLink(v.youtubeId);
const title = escapeHtml(v.title);
return `
    <article class="voice-card">
      <a class="voice-media" href="${link}" target="_blank" rel="noopener">
        <div class="voice-cover">
          <img src="${thumb(v.youtubeId)}" alt="${title}" loading="lazy" />
          <div class="voice-overlay">
            <div class="voice-play voice-play--play"><span data-icon="play"></span></div>
          </div>
        </div>
      </a>
      <div class="voice-content">
        <h3 class="voice-title">${title}</h3>
        ${(v.teacher || v.subject) ? `<div class="voice-meta">
          ${v.teacher ? `<span class="voice-narrator"><span data-icon="user"></span>${escapeHtml(v.teacher)}</span>` : ''}
          ${v.subject ? `<span class="voice-time">${escapeHtml(v.subject)}</span>` : ''}
        </div>` : ''}
        ${v.excerpt ? `<p class="voice-excerpt">${escapeHtml(v.excerpt)}</p>` : ''}
        <div class="voice-actions">
          <a class="listen-btn" href="${link}" target="_blank" rel="noopener">
            <span data-icon="play-circle"></span>
            شاهد الحصة
          </a>
          <button class="icon-btn share-btn" data-action="share-video" data-url="${link}" data-title="${title}">
            <span data-icon="share-2"></span>
          </button>
        </div>
      </div>
    </article>
  `;
}
function renderSkeletonCards(n = 3) {
return Array.from({ length: n }, () => `
    <article class="voice-card voice-card--skeleton" aria-hidden="true">
      <div class="page-skeleton__line page-skeleton__line--lg"></div>
      <div class="page-skeleton__line"></div>
      <div class="page-skeleton__line page-skeleton__line--md"></div>
    </article>
  `).join('');
}
function _render(stage) {
return `
    <section class="page memory-sub-page student-videos-page" data-stage="${stage}">
      <section class="voice-feed" id="study-video-feed">${renderSkeletonCards()}</section>
    </section>
  `;
}
async function _init(stage) {
const page = document.querySelector(`.student-videos-page[data-stage="${stage}"]`);
if (page) await _loadFeed(page, stage);
}
async function _loadFeed(page, stage) {
const feed = page.querySelector('#study-video-feed');
if (!feed) return;
try {
const items = (await getStudyVideos()).filter(v => v.stage === stage).sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
if (!items.length) {
feed.innerHTML = emptyState({
icon: 'video-off',
title: `لسع ما في حصص ${stageLabel(stage)}`,
desc: 'تابعنا هنا أول ما تنزل حصص جديدة.',
});
renderIcons();
return;
}
feed.innerHTML = items.map(renderVideoCard).join('');
renderIcons();
feed.querySelectorAll('[data-action="share-video"]').forEach(btn => {
btn.addEventListener('click', () => {
const { url, title } = btn.dataset;
if (navigator.share) {
navigator.share({ title, url }).catch(() => {});
} else {
navigator.clipboard?.writeText(url);
}
});
});
} catch (err) {
console.error('[StudentVideos] فشل تحميل الحصص:', err);
feed.innerHTML = errorState({ subject: 'الحصص' });
renderIcons(feed);
bindErrorRetry(feed, () => _loadFeed(page, stage));
}
}
export const renderStudentVideosIntermediate = () => _render('intermediate');
export const initStudentVideosIntermediate   = () => _init('intermediate');
export const renderStudentVideosSecondary    = () => _render('secondary');
export const initStudentVideosSecondary      = () => _init('secondary');
