import { WORSHIP_HADITH } from '../data/worship-hadith-data.js';
import { escapeHtml } from '../shared/sanitize.js';
import { toArabicDigits } from '../shared/arabic-digits.js';
function renderItem(item, i) {
return `
    <article class="hadith-item">
      <span class="hadith-item__num" aria-hidden="true">${toArabicDigits(i + 1)}</span>
      <div class="hadith-item__body">
        <p class="hadith-item__text">${escapeHtml(item.text)}</p>
        <p class="hadith-item__source">${escapeHtml(item.source)}</p>
        <div class="hadith-item__sharh">
          <span class="hadith-item__sharh-label">الشرح</span>
          <p>${escapeHtml(item.sharh)}</p>
        </div>
      </div>
    </article>
  `;
}
export function renderWorshipHadith() {
if (!WORSHIP_HADITH.length) {
return `
      <section class="page hadith-page">
        <p class="hadith-empty">لسع ما في أحاديث مضافة هنا — تابعونا قريبًا.</p>
      </section>
    `;
}
return `
    <section class="page hadith-page">
      <div class="page-intro">
        <p>${toArabicDigits(WORSHIP_HADITH.length)} أحاديث شريفة مع شرح مختصر لكل حديث.</p>
      </div>
      <div class="hadith-list">
        ${WORSHIP_HADITH.map(renderItem).join('')}
      </div>
    </section>
  `;
}
export function initWorshipHadith() {
}
