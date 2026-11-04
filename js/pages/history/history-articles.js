import { getHistoryArticles, getHistoryArticle } from '../../data/db.js';
import { showToast }         from '../../shared/toast.js';
import { HISTORY_SECTIONS }   from '../../data/history-data.js';
import { openReader }         from '../reader.js';
import { emptyState }         from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { isPolicyArticle, maybeShowPolicyPrompt } from '../../shared/editorial-policy.js';
const CATEGORY_META = Object.fromEntries(
HISTORY_SECTIONS.map(s => [s.key, { label: s.label }])
);
const LABEL_TO_KEY = Object.fromEntries(HISTORY_SECTIONS.map(s => [s.label, s.key]));
const sectionOf = a => (CATEGORY_META[a.section] ? a.section : (LABEL_TO_KEY[a.category] || a.section));
let _articles = [];
let _policy = null;
function renderPolicyCard(article) {
return `
    <button class="policy-card" data-id="${escapeHtml(String(article.id))}" aria-label="تعرّف على سياسة التحرير">
      <span class="policy-card__icon" aria-hidden="true"><i data-icon="scroll-text"></i></span>
      <span class="policy-card__body">
        <span class="policy-card__title">تعرّف على سياسة التحرير</span>
        <span class="policy-card__cta">اقرأ السياسة</span>
      </span>
      <span class="policy-card__arrow" aria-hidden="true"><i data-icon="chevron-left"></i></span>
    </button>
  `;
}
let _policyOpening = false;
async function _openPolicy() {
if (!_policy || _policyOpening) return;
if (!_policy.lite) { openReader(_policy); return; }
_policyOpening = true;
try {
const full = await getHistoryArticle(_policy.id);
if (full) openReader(full); else showToast('سياسة التحرير ما عادت موجودة', 'error');
} catch {
showToast('ما قدرنا نفتح سياسة التحرير — تأكد من النت وجرّب تاني', 'error');
} finally {
_policyOpening = false;
}
}
function _renderPolicy() {
const box = document.getElementById('article-policy');
if (!box) return;
if (!_policy) { box.innerHTML = ''; box.style.display = 'none'; return; }
box.style.display = '';
box.innerHTML = renderPolicyCard(_policy);
renderIcons(box);
box.querySelector('.policy-card')?.addEventListener('click', () => _openPolicy());
}
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
const badge = CATEGORY_META[sectionOf(article)]?.label || article.category || '';
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
export function renderHistoryArticles() {
return `
    <section class="page history-articles-page">
      <div class="article-policy" id="article-policy" style="display:none;"></div>
      <div class="article-filters" id="article-filters" style="display:none;"></div>
      <section class="article-list" id="article-list" role="list" aria-label="مقالاتنا">
        ${renderSkeletonRows()}
      </section>
    </section>
  `;
}
export async function initHistoryArticles() {
const page = document.querySelector('.history-articles-page');
if (!page) return;
const list = page.querySelector('#article-list');
if (!list) return;
try {
_articles = await getHistoryArticles();
_articles = [..._articles].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
_policy = _articles.find(isPolicyArticle) || null;
if (_policy) _articles = _articles.filter(a => a !== _policy);
_renderPolicy();
_renderFilters();
_renderList('all');
if (_policy) maybeShowPolicyPrompt(() => _openPolicy());
} catch (err) {
console.error('[HistoryArticles] فشل تحميل المقالات:', err);
list.innerHTML = errorState({ subject: 'المقالات' });
renderIcons(list);
bindErrorRetry(list, initHistoryArticles);
}
}
function _renderFilters() {
const bar = document.getElementById('article-filters');
if (!bar) return;
const usedKeys = new Set(_articles.map(sectionOf));
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
const list = document.getElementById('article-list');
if (!list) return;
const visible = (filterKey === 'all')
? _articles
: _articles.filter(a => sectionOf(a) === filterKey);
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
console.warn(`[HistoryArticles] مقال غير موجود: "${btn.dataset.id}"`);
return;
}
if (!article.lite) { openReader(article); return; }
if (btn.dataset.loading) return;
btn.dataset.loading = '1';
try {
const full = await getHistoryArticle(article.id);
if (full) openReader(full); else showToast('المقال دا ما عاد موجود', 'error');
} catch {
showToast('ما قدرنا نفتح المقال — تأكد من النت وجرّب تاني', 'error');
} finally {
delete btn.dataset.loading;
}
});
});
}
