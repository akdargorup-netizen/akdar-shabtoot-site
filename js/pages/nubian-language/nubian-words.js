import { NUBIAN_LANGUAGE_CATEGORIES } from '../../data/nubian-language-data.js';
import { prepareQuery, buildKey, matchesKey } from '../../shared/arabic-search.js';
import { getNubianWords, getNubianWordCategories } from '../../data/db.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { renderWordGrid } from './nubian-word-render.js';
import { bindClipButtons } from '../../shared/audio-clips.js';
function renderCategoryCard(cat, words) {
return `
    <article class="nlang-search-card nlang-search-card--words" id="nlang-cat-${cat.key}" data-cat="${cat.key}">
      <div class="nlang-search-card__header">
        <span class="nlang-search-card__icon" data-icon="${cat.icon}"></span>
        <h3 class="nlang-search-card__title">${escapeHtml(cat.title)}</h3>
        <span class="nlang-search-card__count">${words.length}</span>
      </div>
      ${renderWordGrid(words)}
    </article>
  `;
}
function renderFilters(categories = NUBIAN_LANGUAGE_CATEGORIES) {
const chips = categories
.map(cat => `<button class="filter-chip" data-filter="${cat.key}">${escapeHtml(cat.title)}</button>`)
.join('');
return `
    <nav class="nlang-filters" id="nlang-filters" aria-label="فلاتر تصنيف قاموس الكلمات">
      <button class="filter-chip active" data-filter="all">الكل</button>
      ${chips}
    </nav>
  `;
}
export function renderNubianWords() {
const skeletonCards = NUBIAN_LANGUAGE_CATEGORIES.map(() => `
    <article class="nlang-search-card" aria-hidden="true">
      <div class="page-skeleton__line page-skeleton__line--sm" style="width:40%;"></div>
      <div class="page-skeleton__line page-skeleton__line--md" style="width:60%; margin-top: var(--space-3);"></div>
    </article>
  `).join('');
return `
    <section class="page nlang-page">

      <div class="nlang-intro">
        <p>كلمات من آنداندي — لغة أجدادنا النوبية، محفوظة هنا لتحفظها الأجيال القادمة.</p>
      </div>

      <div class="search-bar">
        <span class="search-bar__icon" data-icon="search"></span>
        <input
          type="text"
          id="nlang-search-input"
          class="search-bar__input"
          placeholder="فتش كلمات آنداندي"
          autocomplete="off"
          disabled
        />
      </div>

      <!-- فلاتر التصنيف (17 تصنيف) — للوصول السريع لحاوية أي تصنيف -->
      ${renderFilters()}

      <!-- حاويات التصنيفات — كل التصنيفات معروضة مباشرة تحت بعض -->
      <div class="nlang-search-results" id="nlang-categories" aria-hidden="true">
        ${skeletonCards}
      </div>

      <div class="nlang-empty" id="nlang-search-empty" hidden role="note">
        <div class="nlang-empty__icon" data-icon="search-x"></div>
        <p class="nlang-empty__title">ما لقينا كلمة بهذا الاسم — جرّب تهجئة تانية</p>
      </div>

    </section>
  `;
}
export async function initNubianWords() {
const { renderIcons } = await import('../../shared/icons.js');
const input     = document.getElementById('nlang-search-input');
const container = document.getElementById('nlang-categories');
const empty     = document.getElementById('nlang-search-empty');
let filterBar = document.getElementById('nlang-filters');
if (!input || !container) return;
let allWords = [];
try {
allWords = await getNubianWords();
} catch (err) {
console.error('[NubianWords] فشل تحميل كلمات القاموس:', err);
}
let categories = NUBIAN_LANGUAGE_CATEGORIES;
try {
categories = await getNubianWordCategories();
if (filterBar && categories.length) {
filterBar.outerHTML = renderFilters(categories);
filterBar = document.getElementById('nlang-filters');
}
} catch {   }
const wordsByCategory = new Map();
allWords.forEach(w => {
if (!wordsByCategory.has(w.category)) wordsByCategory.set(w.category, []);
wordsByCategory.get(w.category).push(w);
});
container.innerHTML = categories
.map(cat => renderCategoryCard(cat, wordsByCategory.get(cat.key) || []))
.join('');
container.removeAttribute('aria-hidden');
renderIcons(container);
bindClipButtons(container);
input.disabled = false;
const catCards = container.querySelectorAll('.nlang-search-card[data-cat]');
let activeFilter = 'all';
function showAllTiles() {
catCards.forEach(card => {
card.querySelectorAll('.nword-tile, .nword-group-header').forEach(el => { el.hidden = false; });
});
}
function applyFilter(key) {
activeFilter = key;
catCards.forEach(card => {
card.hidden = !(key === 'all' || card.dataset.cat === key);
});
}
filterBar?.querySelectorAll('.filter-chip').forEach(chip => {
chip.addEventListener('click', () => {
filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
chip.classList.add('active');
if (input.value.trim()) {
input.value = '';
showAllTiles();
if (empty) empty.hidden = true;
}
const key = chip.dataset.filter;
applyFilter(key);
if (key === 'all') {
filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
} else {
document.getElementById(`nlang-cat-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
});
});
input.addEventListener('input', () => {
const pq = prepareQuery(input.value);
if (pq.isEmpty) {
showAllTiles();
applyFilter(activeFilter);
if (empty) empty.hidden = true;
return;
}
let anyVisible = false;
catCards.forEach(card => {
const titleMatch = matchesKey(buildKey(card.querySelector('.nlang-search-card__title').textContent), pq);
const tiles = card.querySelectorAll('.nword-tile');
let cardHasMatch = titleMatch;
tiles.forEach(tile => {
const match = titleMatch || matchesKey(tile.dataset.search || '', pq);
tile.hidden = !match;
if (match) cardHasMatch = true;
});
card.querySelectorAll('.nword-group-header').forEach(gh => {
let el = gh.nextElementSibling;
let hasVisible = false;
while (el && !el.classList.contains('nword-group-header')) {
if (!el.hidden) { hasVisible = true; break; }
el = el.nextElementSibling;
}
gh.hidden = !hasVisible;
});
card.hidden = !cardHasMatch;
if (cardHasMatch) anyVisible = true;
});
if (empty) empty.hidden = anyVisible;
});
}
