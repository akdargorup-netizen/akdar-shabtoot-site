import { HISN_CATEGORIES, WORSHIP_HISN } from '../data/worship-hisn-data.js';
import { escapeHtml } from '../shared/sanitize.js';
import { toArabicDigits } from '../shared/arabic-digits.js';
function renderFilters() {
return HISN_CATEGORIES.map((cat, i) => `
    <button class="quran-chip${i === 0 ? ' is-active' : ''}" role="tab"
            aria-selected="${i === 0 ? 'true' : 'false'}" data-filter="${cat.key}">${cat.label}</button>
  `).join('');
}
function renderHisnItem(item, index) {
return `
    <article class="hisn-item" data-category="${escapeHtml(item.category)}">
      <span class="hisn-item__index">${toArabicDigits(index + 1)}</span>
      <div class="hisn-item__body">
        <p class="hisn-item__text">${escapeHtml(item.text)}</p>
        <p class="hisn-item__source">${escapeHtml(item.source)}</p>
      </div>
    </article>
  `;
}
export function renderWorshipHisn() {
const items = WORSHIP_HISN.map(renderHisnItem).join('');
return `
    <section class="page worship-hisn-page">

      <div class="page-intro">
        <p>أذكار الصباح والمساء والنوم من كتاب "حصن المسلم" للشيخ سعيد بن علي بن وهف القحطاني رحمه الله.</p>
      </div>

      <div class="quran-chips hisn-chips" id="hisn-filters" role="tablist" aria-label="تصنيف الأذكار">
        ${renderFilters()}
      </div>

      <section class="hisn-list" id="hisn-list">
        ${items}
      </section>

    </section>
  `;
}
export function initWorshipHisn() {
const page = document.querySelector('.worship-hisn-page');
if (!page) return;
const list = page.querySelector('#hisn-list');
function applyFilter(key) {
list.querySelectorAll('.hisn-item').forEach(el => {
el.hidden = el.dataset.category !== key;
});
}
page.querySelectorAll('.quran-chip[data-filter]').forEach(btn => {
btn.addEventListener('click', () => {
page.querySelectorAll('.quran-chip[data-filter]').forEach(b => {
const on = b === btn;
b.classList.toggle('is-active', on);
b.setAttribute('aria-selected', on ? 'true' : 'false');
});
applyFilter(btn.dataset.filter);
});
});
applyFilter(HISN_CATEGORIES[0].key);
}
