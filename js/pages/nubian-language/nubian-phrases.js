import { getNubianPhraseCategories, getNubianPhrases } from '../../data/db.js';
import { emptyState } from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { clipButtonHtml, clipOffHtml, bindClipButtons } from '../../shared/audio-clips.js';
function renderPhraseCard(p) {
const isMissing = !p.nub && !p.translit;
if (isMissing) {
return `
      <div class="nphrase-item nphrase-item--empty">
        <p class="nphrase-item__ar">${escapeHtml(p.ar)}</p>
        <p class="nphrase-item__note">${escapeHtml(p.note || 'لسع ما اتسجلت')}</p>
      </div>`;
}
return `
    <div class="nphrase-item nphrase-item--stack">
      <div class="nphrase-item__body">
        <p class="nphrase-item__ar">${escapeHtml(p.ar)}</p>
        <p class="nphrase-item__nub">${escapeHtml(p.nub)}</p>
      </div>
      <div class="nphrase-item__foot">
        <p class="nphrase-item__translit">${escapeHtml(p.translit || '')}</p>
        <div class="nphrase-item__audio">${clipButtonHtml(p.audio) || clipOffHtml()}</div>
      </div>
    </div>`;
}
function renderCategoryCard(cat, phrases) {
return `
    <article class="nlang-search-card nlang-search-card--words" data-cat="${cat.key}">
      <div class="nlang-search-card__header">
        <span class="nlang-search-card__icon" data-icon="${cat.icon || 'message-square'}"></span>
        <h3 class="nlang-search-card__title">${escapeHtml(cat.title)}</h3>
        <span class="nlang-search-card__count">${phrases.length}</span>
      </div>
      <div class="nphrase-list">
        ${phrases.length
? phrases.map(renderPhraseCard).join('')
: `<div class="nphrase-item nphrase-item--empty">
               <p class="nphrase-item__note">الجمل لسع ما اتضافت</p>
             </div>`}
      </div>
    </article>
  `;
}
export function renderNubianPhrases() {
return `
    <section class="page nlang-page">

      <div class="nlang-intro">
        <p>جمل وعبارات جاهزة للاستخدام اليومي بآنداندي، مقسّمة حسب الموقف.</p>
      </div>

      <div id="nphrase-area">
        <div class="nlang-search-results" aria-hidden="true">
          <div class="nlang-search-card">
            <div class="page-skeleton__line page-skeleton__line--sm" style="width:40%;"></div>
            <div class="page-skeleton__line page-skeleton__line--md" style="width:60%; margin-top: var(--space-3);"></div>
          </div>
        </div>
      </div>

    </section>
  `;
}
export async function initNubianPhrases() {
const { renderIcons } = await import('../../shared/icons.js');
const area = document.getElementById('nphrase-area');
if (!area) return;
try {
const [categories, allPhrases] = await Promise.all([
getNubianPhraseCategories(),
getNubianPhrases(),
]);
if (!categories.length) {
area.innerHTML = emptyState({
icon: 'message-square',
title: 'لسع ما في تصنيفات مضافة',
desc: 'قسم "تعلم الكلام" جاهز — والتصنيفات حتتضاف قريب.',
});
renderIcons(area);
return;
}
const phrasesByCategory = new Map();
allPhrases.forEach(p => {
if (!phrasesByCategory.has(p.category)) phrasesByCategory.set(p.category, []);
phrasesByCategory.get(p.category).push(p);
});
area.innerHTML = `
      <div class="nlang-search-results">
        ${categories.map(cat => renderCategoryCard(cat, phrasesByCategory.get(cat.key) || [])).join('')}
      </div>
    `;
renderIcons(area);
bindClipButtons(area);
} catch (err) {
console.error('[NubianPhrases] فشل تحميل تعلم الكلام:', err);
area.innerHTML = errorState({ subject: 'تعلم الكلام' });
renderIcons(area);
bindErrorRetry(area, () => initNubianPhrases());
}
}
