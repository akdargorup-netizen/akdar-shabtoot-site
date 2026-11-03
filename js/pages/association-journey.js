import { getAssociationJourneyArticles, getAssociationJourneyArticle } from '../data/db.js';
import { showToast }         from '../shared/toast.js';
import { ASSOCIATION_JOURNEY_SECTIONS }  from '../data/association-journey-data.js';
import { openReader }         from './reader.js';
import { emptyState }         from '../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../shared/error-state.js';
import { renderIcons } from '../shared/icons.js';
import { escapeHtml } from '../shared/sanitize.js';
const CATEGORY_META = Object.fromEntries(
ASSOCIATION_JOURNEY_SECTIONS.map(s => [s.key, { label: s.label }])
);
let _articles = [];
function renderSkeletonRows(n = 5) {
return Array.from({ length: n }, () => `
    <div class="article-item article-item--skeleton" aria-hidden="true">
      <span class="article-number article-number--skeleton"></span>
      <span class="article-content">
        <span class="page-skeleton__line page-skeleton__line--sm" style="width:38%;"></span>
        <span class="page-skeleton__line page-skeleton__line--lg" style="width:78%;"></span>
      </span>
    </div>
  `).join('');
}
function renderArticleRow(article, index, total) {
const badge = CATEGORY_META[article.section]?.label || article.category || '';
const title = escapeHtml(article.title);
return `
    <button class="article-item" data-id="${article.id}" aria-label="اقرأ: ${title}">
      <span class="article-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
      <span class="article-content">
        <span class="article-tags">
          ${badge ? `<span class="article-badge">${escapeHtml(badge)}</span>` : ''}
        </span>
        <span class="article-title">${title}</span>
      </span>
      <span class="article-arrow" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" class="article-arrow__svg">
          <circle cx="14" cy="14" r="13" stroke="currentColor" stroke-width="1.2" class="article-arrow__ring"/>
          <path d="M15.5 10L11 14L15.5 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="article-arrow__chevron"/>
          <path d="M11 14H18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" class="article-arrow__line"/>
        </svg>
      </span>
    </button>
    ${index < total - 1 ? '<div class="article-divider" aria-hidden="true"></div>' : ''}
  `;
}
export function renderAssociationJourney() {
return `
    <section class="page association-journey-page">
      <div class="article-filters" id="journey-article-filters" style="display:none;"></div>
      <section class="article-list" id="journey-article-list" role="list" aria-label="مسيرة الرابطة">
        ${renderSkeletonRows()}
      </section>
    </section>
  `;
}
export async function initAssociationJourney() {
const page = document.querySelector('.association-journey-page');
if (!page) return;
const list = page.querySelector('#journey-article-list');
if (!list) return;
try {
_articles = await getAssociationJourneyArticles();
_articles = [..._articles].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
_renderFilters();
_renderList('all');
} catch (err) {
console.error('[AssociationJourney] فشل تحميل المقالات:', err);
list.innerHTML = errorState({ subject: 'المقالات' });
renderIcons(list);
bindErrorRetry(list, initAssociationJourney);
}
}
function _renderFilters() {
const bar = document.getElementById('journey-article-filters');
if (!bar) return;
const usedKeys = new Set(_articles.map(a => a.section));
const cats = Object.keys(CATEGORY_META).filter(key => usedKeys.has(key));
if (cats.length < 2) {
bar.style.display = 'none';
bar.innerHTML = '';
return;
}
bar.style.display = 'flex';
bar.innerHTML = `
    <button class="filter-chip active" data-filter="all">الكل</button>
    ${cats.map(key => `<button class="filter-chip" data-filter="${key}">${CATEGORY_META[key].label}</button>`).join('')}
  `;
bar.querySelectorAll('.filter-chip').forEach(chip => {
chip.addEventListener('click', () => {
bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
chip.classList.add('active');
_renderList(chip.dataset.filter);
});
});
}
function _renderList(filterKey) {
const list = document.getElementById('journey-article-list');
if (!list) return;
const visible = (filterKey === 'all')
? _articles
: _articles.filter(a => a.section === filterKey);
if (!visible.length) {
list.innerHTML = emptyState({
icon: 'scroll-text',
title: 'لسع ما في مقالات',
desc: 'تابعنا هنا أول ما ننشر مقال جديد في التصنيف دا.',
});
renderIcons(list);
return;
}
list.innerHTML = visible.map((a, i) => renderArticleRow(a, i, visible.length)).join('');
renderIcons(list);
list.querySelectorAll('.article-item[data-id]').forEach(btn => {
btn.addEventListener('click', async () => {
const article = visible.find(a => String(a.id) === btn.dataset.id);
if (!article) {
console.warn(`[AssociationJourney] مقال غير موجود: "${btn.dataset.id}"`);
return;
}
if (!article.lite) { openReader(article); return; }
if (btn.dataset.loading) return;
btn.dataset.loading = '1';
try {
const full = await getAssociationJourneyArticle(article.id);
if (full) openReader(full); else showToast('المقال دا ما عاد موجود', 'error');
} catch {
showToast('ما قدرنا نفتح المقال — تأكد من النت وجرّب تاني', 'error');
} finally {
delete btn.dataset.loading;
}
});
});
}
