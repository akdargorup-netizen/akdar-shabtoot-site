import { DID_YOU_KNOW, getNextDykIndex } from '../../data/did-you-know-data.js';
import { fetchUrgentAnnouncement, renderUrgentBanner } from '../../shared/urgent-announcement.js';
import { renderIcons } from '../../shared/icons.js';
import { refreshSectionBadges } from '../../shared/section-badges.js';
export function renderHome() {
return `
    <section class="page home-page">

      <!-- Hero — صورة القرية فقط، الصورة تحمل المعلومات بذاتها.
           لو فيه نداء إنساني عاجل شغال، initHome() بتستبدل المحتوى
           هنا بالكامل بالنداء بدل الصورة — استبدال مش تراكب، عشان
           الصورة ما تفضلش ظاهرة في الخلف وتعمل مشاكل مظهرية. -->
      <div class="home-hero-area" id="home-hero-area">
        <div class="home-hero" aria-hidden="true">
          <img
            src="assets/village/village-aerial.jpg"
            alt=""
            class="home-hero__img"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            onload="this.classList.add('loaded')"
          />
          <div class="home-hero__overlay"></div>
        </div>
      </div>

      <!-- شبكة الأقسام — قاعدة ألوان عامة اتعدّلت (أغسطس 2026): مش كل
           قسم يستحق لون هوية مستقل. أربعة أقسام بس هم اللي يستحقوا
           تميز لوني — الأخبار، المناسبات، العبادة، الرُطانة (اللغة
           النوبية) — والباقي (الفعاليات، التاريخ، الرابطة) يرجع للون
           الطبيعي (أخضر براند) بدل ما كل قسم يفصّل هويته الخاصة.
           الألوان المطبّقة دلوقتي:
             - الأخبار: أحمر (danger) — استثناء، توهج خلفية بس.
             - المناسبات: أخضر نيلي/طحلبي (reed) — نفس community-occasions.css.
             - الرُطانة: ذهبي (accent) — نفس nubian-language.css، هويتها
               الخاصة باقية زي ما هي.
             - الفعاليات + التاريخ + الرابطة: أخضر براند طبيعي (brand/green)
               — نفس history.css وassociation.css. الفعاليات كانت ذهبية
               (نفس لون الرُطانة، بالصدفة) واترجعت للأخضر الطبيعي من
               برّه (كلاس البطاقة هنا) ومن جوّه كمان (events.css نفسها،
               مش بس مظهرها في الرئيسية).
             - العبادة (البطاقة العريضة تحت الشبكة): حجري (stone) — نفس
               worship.css.

           صف أول (primary): الأخبار + المناسبات.
           صف تاني (primary): الرُطانة + الفعاليات.
           صف ثالث (secondary، أصغر): التاريخ + الرابطة.
           تحت الشبكة: بطاقة عريضة واحدة بس تستحق التميز (العبادة) —
           اختيرت بدل الرُطانة لأن استخدامها يومي متكرر (سبحة/أذكار)،
           والموقع المميز نفسه وسيلة لتشجيع بناء عادة الذكر اليومي، مش
           بس انعكاس لتميز هوياتي. ثم معلومة اليوم.

           خلفية تاريخية: "الخدمات" اتشالت من الشبكة لأنها مكرّرة مع
           الشريط السفلي. "جيل أخضر" اتشالت كقسم مستقل بالكامل من قبل.
           "بيت المناسبات" و"شوف الفعاليات" كانوا جوّه فهرس "المجتمع"
           (community.js) واتنقلوا هنا مباشرة — فهرس المجتمع بقى بلا
           فائدة وبقى غير مستخدم. بيت المناسبات ورثت هوية "المجتمع"
           اللونية (reed) زي ما هي. العنوانين المكوّنين من كلمة واحدة
           متسقين مع عنوان الصفحة في الهيدر ولوحة الإدارة وفهرس البحث
           الذكي. -->
      <section class="home-section">
        <div class="home-grid">

          <!-- صف أول: الأخبار (أحمر — استثناء توهج خلفية بس) +
               المناسبات (أخضر نيلي/طحلبي — نفس community-occasions.css). -->
          <div class="home-card home-card--primary home-card--news" data-page="news">
            <div class="home-card__icon animate-breathe" data-icon="newspaper"></div>
            <div class="home-card__body">
              <div class="home-card__title">الأخبار</div>
              <span class="home-card__identity home-card__identity--news">الجديد هنا</span>
            </div>
          </div>

          <div class="home-card home-card--primary home-card--community" data-page="community-occasions">
            <div class="home-card__icon animate-breathe" data-icon="flower-2"></div>
            <div class="home-card__body">
              <div class="home-card__title">المناسبات</div>
              <span class="home-card__identity home-card__identity--community">بركة وتعزية</span>
            </div>
          </div>

          <!-- صف تاني: الرُطانة (ذهبي — هويتها الداخلية في
               nubian-language.css، من الأقسام الأربعة المميزة لونيًا) +
               الفعاليات (أخضر براند طبيعي — رجعت لهوية history.css/
               association.css من برّه وجوّه، بعد ما كانت ذهبية زي
               الرُطانة بالصدفة). -->
          <div class="home-card home-card--primary home-card--accent" data-page="nubian-dictionary">
            <div class="home-card__icon" data-icon="languages"></div>
            <div class="home-card__body">
              <div class="home-card__title">آنداندي</div>
              <span class="home-card__identity home-card__identity--accent">اللغة النوبية</span>
            </div>
          </div>

          <div class="home-card home-card--primary home-card--green" data-page="events">
            <div class="home-card__icon" data-icon="calendar"></div>
            <div class="home-card__title">الفعاليات</div>
          </div>

          <!-- صف ثالث: التاريخ + الرابطة — أخضر براند (هويتهم الداخلية
               في history.css وassociation.css)، بحجم ثانوي أصغر. -->
          <div class="home-card home-card--secondary home-card--green" data-page="history">
            <div class="home-card__icon" data-icon="landmark"></div>
            <div class="home-card__title">التاريخ</div>
          </div>

          <div class="home-card home-card--secondary home-card--green" data-page="association">
            <div class="home-card__icon" data-icon="shield"></div>
            <div class="home-card__title">الرابطة</div>
          </div>

        </div>
      </section>

      <!-- بطاقة العبادة — العريضة الوحيدة، مستقلة تحت الشبكة، تفتح
           فهرس العبادة (القرآن، التسبيح، حصن المسلم) مباشرة. لونها
           حجري (stone) — نفس هويتها الداخلية في worship.css. -->
      <section class="home-section home-section--feature">
        <div class="home-feature-card" data-page="worship">
          <div class="home-feature-card__icon" data-icon="moon-star"></div>
          <div class="home-feature-card__body">
            <span class="home-feature-card__eyebrow">قرآن، تسبيح، وأذكار</span>
            <span class="home-feature-card__title">العبادة</span>
          </div>
          <div class="home-feature-card__arrow" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
              <path d="M11 7L8 10L11 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </section>

      <!-- معلومة اليوم -->
      <div id="home-fact-area"></div>

    </section>
  `;
}
export async function initHome() {
const heroArea = document.getElementById('home-hero-area');
if (heroArea) {
fetchUrgentAnnouncement().then(announcement => {
if (!heroArea.isConnected) return;
const bannerHtml = announcement ? renderUrgentBanner(announcement, 'home') : '';
if (!bannerHtml) return;
const originalHero = heroArea.innerHTML;
heroArea.innerHTML = bannerHtml;
renderIcons(heroArea);
document.addEventListener('urgent-dismissed', () => {
heroArea.innerHTML = originalHero;
renderIcons(heroArea);
}, { once: true });
}).catch(() => {   });
}
_initNewContentDots();
const factArea = document.getElementById('home-fact-area');
if (!factArea || !DID_YOU_KNOW.length) return;
let currentIdx = getNextDykIndex();
const ICON_PREV = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M10.5 5.5L13.5 9L10.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4.5 9H13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
const ICON_NEXT = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M7.5 5.5L4.5 9L7.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13.5 9H4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
const MAX_DOTS = Math.min(DID_YOU_KNOW.length, 8);
factArea.innerHTML = `
    <div class="home-fact-card" role="note">
      <div class="home-fact-card__top">
        <div class="home-fact-card__label-group">
          <span class="home-fact-card__badge">✦</span>
          <span class="home-fact-card__label">كنت عارف دي؟</span>
        </div>
        <span class="home-fact-card__counter" id="home-fact-counter"></span>
      </div>

      <p class="home-fact-card__text" id="home-fact-text"></p>

      <div class="home-fact-card__footer">
        <div class="home-fact-card__dots" id="home-fact-dots">
          ${Array.from({ length: MAX_DOTS }, () =>
`<span class="home-fact-dot"></span>`
).join('')}
        </div>
        <div class="home-fact-card__actions">
          <button class="home-fact-card__nav" id="home-fact-prev" aria-label="معلومة سابقة">${ICON_PREV}</button>
          <button class="home-fact-card__more" id="home-fact-more">
            شوف الباقي
          </button>
          <button class="home-fact-card__nav" id="home-fact-next" aria-label="معلومة تالية">${ICON_NEXT}</button>
        </div>
      </div>
    </div>
  `;
const elText    = document.getElementById('home-fact-text');
const elCounter = document.getElementById('home-fact-counter');
const elPrev    = document.getElementById('home-fact-prev');
const elNext    = document.getElementById('home-fact-next');
const elDots    = document.getElementById('home-fact-dots')?.children;
function update() {
elText.textContent    = DID_YOU_KNOW[currentIdx];
elCounter.textContent = `${currentIdx + 1} / ${DID_YOU_KNOW.length}`;
elPrev.disabled       = currentIdx === 0;
elNext.disabled       = currentIdx === DID_YOU_KNOW.length - 1;
if (elDots) {
const activeDot = currentIdx % MAX_DOTS;
Array.from(elDots).forEach((dot, i) => {
dot.classList.toggle('home-fact-dot--active', i === activeDot);
});
}
}
elPrev.addEventListener('click', () => {
if (currentIdx > 0) { currentIdx--; update(); }
});
elNext.addEventListener('click', () => {
if (currentIdx < DID_YOU_KNOW.length - 1) { currentIdx++; update(); }
});
document.getElementById('home-fact-more')?.addEventListener('click', () => {
import('../../core/router.js').then(m => m.navigateTo('did-you-know'));
});
update();
}
async function _initNewContentDots() {
await refreshSectionBadges();
}
