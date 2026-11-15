import { QURAN_SURAHS } from '../data/quran-index.js';
import { loadSurahAyahs } from '../data/quran-loader.js';
import { openWorshipQuranSurah } from './worship-quran-surah.js';
import { escapeHtml } from '../shared/sanitize.js';
import { toArabicDigits } from '../shared/arabic-digits.js';
import { prepareQuery, buildKey, matchesKey } from '../shared/arabic-search.js';
import { getResumeTarget, ayahPreview } from '../shared/quran-progress.js';
function renderSurahRow(surah) {
const isMeccan = surah.type === 'meccan';
const typeLabel = isMeccan ? 'مكية' : 'مدنية';
return `
    <div class="quran-surah-row" role="button" tabindex="0"
         data-surah="${surah.index}"
         data-type="${isMeccan ? 'meccan' : 'medinan'}"
         data-search="${escapeHtml(buildKey(surah.name))}">
      <span class="quran-surah-row__index">
        <span class="quran-surah-row__index-frame"></span>
        <span class="quran-surah-row__index-digit">${toArabicDigits(surah.index)}</span>
      </span>
      <div class="quran-surah-row__body">
        <span class="quran-surah-row__name">${escapeHtml(surah.name)}</span>
        <span class="quran-surah-row__badge quran-surah-row__badge--${isMeccan ? 'meccan' : 'medinan'}">${typeLabel}</span>
      </div>
      <span class="quran-surah-row__count">
        <span class="quran-surah-row__count-num">${toArabicDigits(surah.ayahCount)}</span>
        <span class="quran-surah-row__count-label">آية</span>
      </span>
    </div>
  `;
}
function renderResumeCard() {
const t = getResumeTarget();
if (!t) return '';
const { surah, ayah, afterFinished } = t;
const label = afterFinished ? `أتممت سورة ${afterFinished} — ابدأ التالية` : 'تابع من حيث توقفت';
const where = afterFinished
? 'من أول السورة'
: `الآية ${toArabicDigits(ayah)} من ${toArabicDigits(surah.ayahCount)}`;
const pct = afterFinished ? 0 : Math.max(2, Math.round((ayah / surah.ayahCount) * 100));
const aria = afterFinished
? `ابدأ سورة ${surah.name}`
: `تابع القراءة من سورة ${surah.name}، الآية ${ayah}`;
return `
    <button type="button" class="quran-resume" id="quran-resume"
            data-surah="${surah.index}" data-ayah="${ayah}" aria-label="${escapeHtml(aria)}">
      <svg class="quran-resume__mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.6L6 20V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <span class="quran-resume__body">
        <span class="quran-resume__label">${escapeHtml(label)}</span>
        <span class="quran-resume__name">${escapeHtml(surah.name)}</span>
        <span class="quran-resume__snippet" id="quran-resume-snippet"></span>
        <span class="quran-resume__where">${where}</span>
      </span>
      <svg class="quran-resume__go" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${afterFinished ? '' : `<span class="quran-resume__track" aria-hidden="true"><span class="quran-resume__fill" style="width:${pct}%"></span></span>`}
    </button>
  `;
}
export function renderWorshipQuran() {
return `
    <section class="page worship-quran-page">

      <div class="quran-toolbar">
        <div class="search-bar" id="quran-search-bar">
          <span class="search-bar__icon" data-icon="search"></span>
          <input
            type="text"
            id="quran-search-input"
            class="search-bar__input"
            placeholder="ابحث باسم السورة أو رقمها..."
            autocomplete="off"
            enterkeyhint="search"
          />
          <button class="search-bar__clear" id="quran-search-clear" aria-label="مسح البحث" style="display:none">
            <span data-icon="x"></span>
          </button>
        </div>
      </div>

      ${renderResumeCard()}

      <!-- شرائح التصفية خارج الشريط الثابت: تتحرك مع تمرير الصفحة بينما يبقى البحث ثابتًا -->
      <div class="quran-chips" id="quran-chips" role="tablist" aria-label="تصفية السور">
        <button class="quran-chip is-active" role="tab" aria-selected="true" data-filter="all">الكل</button>
        <button class="quran-chip" role="tab" aria-selected="false" data-filter="meccan">مكية</button>
        <button class="quran-chip" role="tab" aria-selected="false" data-filter="medinan">مدنية</button>
      </div>

      <div class="quran-surah-list" id="quran-surah-list">
        ${QURAN_SURAHS.map(renderSurahRow).join('')}
      </div>

      <p class="quran-empty-search" id="quran-empty-search" style="display:none">
        ما في سورة بالاسم دا.
      </p>

    </section>
  `;
}
export function initWorshipQuran() {
const list        = document.getElementById('quran-surah-list');
const input       = document.getElementById('quran-search-input');
const clearBtn    = document.getElementById('quran-search-clear');
const emptyMsg    = document.getElementById('quran-empty-search');
const chips       = document.getElementById('quran-chips');
const resume      = document.getElementById('quran-resume');
if (!list) return;
function openWith(el, idx, opts) {
if (!Number.isInteger(idx) || el.classList.contains('is-loading')) return;
el.classList.add('is-loading');
el.setAttribute('aria-busy', 'true');
Promise.resolve(openWorshipQuranSurah(idx, opts)).finally(() => {
el.classList.remove('is-loading');
el.removeAttribute('aria-busy');
});
}
function open(e) {
const row = e.target.closest('[data-surah]');
if (!row) return;
openWith(row, parseInt(row.dataset.surah, 10));
}
function bindOpenHandlers(container) {
if (!container) return;
container.addEventListener('click', open);
container.addEventListener('keydown', (e) => {
if (e.key === 'Enter' || e.key === ' ') {
e.preventDefault();
open(e);
}
});
}
bindOpenHandlers(list);
if (resume) {
const idx  = parseInt(resume.dataset.surah, 10);
const ayah = parseInt(resume.dataset.ayah, 10);
resume.addEventListener('click', () => openWith(resume, idx, { ayah }));
const snippetEl = document.getElementById('quran-resume-snippet');
if (snippetEl && Number.isInteger(idx)) {
loadSurahAyahs(idx)
.then((ayahs) => {
if (!snippetEl.isConnected) return;
snippetEl.textContent = ayahPreview({ index: idx, ayahs }, ayah);
})
.catch(() => {   });
}
}
let activeFilter = 'all';
const rows = Array.from(list.querySelectorAll('.quran-surah-row'));
function applyFilters() {
const pq = prepareQuery(input ? input.value : '');
const q = pq.norm;
const isNumber = /^\d+$/.test(q);
let anyVisible = false;
rows.forEach((row) => {
const typeOk = activeFilter === 'all' || row.dataset.type === activeFilter;
let textOk = true;
if (!pq.isEmpty) {
textOk = isNumber
? row.dataset.surah === String(parseInt(q, 10))
: matchesKey(row.dataset.search, pq);
}
const show = typeOk && textOk;
row.style.display = show ? '' : 'none';
if (show) anyVisible = true;
});
if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';
if (resume) resume.style.display = (!pq.isEmpty || activeFilter !== 'all') ? 'none' : '';
emptyMsg.style.display = anyVisible ? 'none' : '';
list.style.display = anyVisible ? '' : 'none';
}
if (input) {
input.addEventListener('input', applyFilters);
clearBtn.addEventListener('click', () => {
input.value = '';
applyFilters();
input.focus();
});
}
if (chips) {
chips.addEventListener('click', (e) => {
const chip = e.target.closest('.quran-chip');
if (!chip) return;
activeFilter = chip.dataset.filter;
chips.querySelectorAll('.quran-chip').forEach((c) => {
const on = c === chip;
c.classList.toggle('is-active', on);
c.setAttribute('aria-selected', on ? 'true' : 'false');
});
applyFilters();
});
}
}
