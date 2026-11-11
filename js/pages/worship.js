import { WORSHIP_HADITH, getNextHadithIndex } from '../data/worship-hadith-data.js';
import { getTodayStory } from '../data/worship-story-data.js';
import { navigateTo } from '../core/router.js';
import { renderIcons } from '../shared/icons.js';
import { escapeHtml } from '../shared/sanitize.js';
const ICON_PREV = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
  <path d="M10.5 5.5L13.5 9L10.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4.5 9H13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
const ICON_NEXT = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
  <path d="M7.5 5.5L4.5 9L7.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13.5 9H4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
const ARROW_SVG = `
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
    <path d="M11 7L8 10L11 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
const NAV_CARDS = [
{
page: 'worship-quran',
icon: 'book-open',
title: 'القرآن الكريم',
desc: 'تصفح بالسور والأجزاء، وبحث بسيط، وحفظ آخر موضع قراءة.',
},
{
page: 'worship-tasbih',
icon: 'circle-dot',
title: 'السبحة الإلكترونية',
desc: 'عداد تسبيح يعمل بالكامل من غير إنترنت، ويحفظ عدّك تلقائيًا.',
},
{
page: 'worship-hisn',
icon: 'shield-check',
title: 'حصن المسلم',
desc: 'أذكار الصباح والمساء والنوم، وأذكار بعد الصلوات.',
},
{
page: 'worship-lectures',
icon: 'headphones',
title: 'محاضرات دينية',
desc: 'محاضرات مصوّرة نختارها لكم، تُعرض من يوتيوب.',
},
];
function renderNavCard(card) {
return `
    <div class="worship-nav-card" data-page="${card.page}">
      <div class="worship-nav-card__icon" data-icon="${card.icon}"></div>
      <div class="worship-nav-card__body">
        <h3 class="worship-nav-card__title">${card.title}</h3>
        <p class="worship-nav-card__desc">${card.desc}</p>
      </div>
      <div class="worship-nav-card__arrow" aria-hidden="true">${ARROW_SVG}</div>
    </div>
  `;
}
export function renderWorship() {
return `
    <section class="page worship-page">

      <div class="worship-nav-grid">
        ${NAV_CARDS.map(renderNavCard).join('')}
      </div>

      <!-- حاوية الأحاديث — تُملأ ديناميكيًا في initWorship -->
      <div id="worship-hadith-area"></div>

      <!-- حاوية قصة اليوم — تُملأ ديناميكيًا في initWorship -->
      <div id="worship-story-area"></div>

    </section>
  `;
}
function initHadithWidget() {
const area = document.getElementById('worship-hadith-area');
if (!area || !WORSHIP_HADITH.length) return;
let currentIdx = getNextHadithIndex();
const MAX_DOTS = Math.min(WORSHIP_HADITH.length, 8);
area.innerHTML = `
    <div class="worship-hadith-card" role="note">
      <div class="worship-hadith-card__top">
        <div class="worship-hadith-card__label-group">
          <span class="worship-hadith-card__badge">✦</span>
          <span class="worship-hadith-card__label">من الحديث الشريف</span>
        </div>
        <span class="worship-hadith-card__counter" id="worship-hadith-counter"></span>
      </div>

      <p class="worship-hadith-card__text" id="worship-hadith-text"></p>
      <p class="worship-hadith-card__source" id="worship-hadith-source"></p>

      <div class="worship-hadith-card__sharh" id="worship-hadith-sharh-wrap">
        <span class="worship-hadith-card__sharh-label">الشرح</span>
        <p class="worship-hadith-card__sharh-text" id="worship-hadith-sharh"></p>
      </div>

      <div class="worship-hadith-card__footer">
        <div class="worship-hadith-card__dots" id="worship-hadith-dots">
          ${Array.from({ length: MAX_DOTS }, () => '<span class="worship-hadith-dot"></span>').join('')}
        </div>
        <div class="worship-hadith-card__actions">
          <button class="worship-hadith-card__nav" id="worship-hadith-prev" aria-label="حديث سابق">${ICON_PREV}</button>
          <button class="worship-hadith-card__more" id="worship-hadith-more">شوف الباقي</button>
          <button class="worship-hadith-card__nav" id="worship-hadith-next" aria-label="حديث تالٍ">${ICON_NEXT}</button>
        </div>
      </div>
    </div>
  `;
const elText    = document.getElementById('worship-hadith-text');
const elSource  = document.getElementById('worship-hadith-source');
const elSharhWrap = document.getElementById('worship-hadith-sharh-wrap');
const elSharh   = document.getElementById('worship-hadith-sharh');
const elMore    = document.getElementById('worship-hadith-more');
const elCounter = document.getElementById('worship-hadith-counter');
const elPrev    = document.getElementById('worship-hadith-prev');
const elNext    = document.getElementById('worship-hadith-next');
const elDots    = document.getElementById('worship-hadith-dots')?.children;
function update() {
const item = WORSHIP_HADITH[currentIdx];
elText.textContent    = item.text;
elSource.textContent  = item.source;
elSharh.textContent   = item.sharh || '';
elSharhWrap.hidden    = !item.sharh;
elCounter.textContent = `${currentIdx + 1} / ${WORSHIP_HADITH.length}`;
if (elDots) {
const activeDot = currentIdx % MAX_DOTS;
Array.from(elDots).forEach((dot, i) => {
dot.classList.toggle('worship-hadith-dot--active', i === activeDot);
});
}
}
elMore.addEventListener('click', () => navigateTo('worship-hadith'));
elPrev.addEventListener('click', () => {
currentIdx = (currentIdx - 1 + WORSHIP_HADITH.length) % WORSHIP_HADITH.length;
update();
});
elNext.addEventListener('click', () => {
currentIdx = (currentIdx + 1) % WORSHIP_HADITH.length;
update();
});
update();
}
function initStoryWidget() {
const area = document.getElementById('worship-story-area');
const story = getTodayStory();
if (!area || !story) return;
area.innerHTML = `
    <div class="worship-story-card" role="note">
      <div class="worship-story-card__top">
        <span class="worship-story-card__icon" data-icon="book-heart"></span>
        <span class="worship-story-card__label">قصة اليوم</span>
      </div>
      <h3 class="worship-story-card__title">${escapeHtml(story.title)}</h3>
      <p class="worship-story-card__text">${escapeHtml(story.story)}</p>
      <div class="worship-story-card__wisdom">
        <span class="worship-story-card__wisdom-label" data-icon="sparkles"></span>
        <p class="worship-story-card__wisdom-text"><strong>الحكمة:</strong> ${escapeHtml(story.wisdom)}</p>
      </div>
    </div>
  `;
renderIcons(area);
}
export function initWorship() {
initHadithWidget();
initStoryWidget();
}
