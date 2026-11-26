export const TIERS = [
{ id: 'gold',   label: 'ذهبي',   plural: 'المساهمون الذهبيون' },
{ id: 'silver', label: 'فضي',    plural: 'المساهمون الفضيون' },
{ id: 'bronze', label: 'برونزي', plural: 'المساهمون البرونزيون' },
];
export const CONTRIBUTORS = [
{ n: 'خالد عثمان الأمين',       t: '',         tier: 'gold' },
{ n: 'مدثر علي آرقاوي',         t: '',         tier: 'gold' },
{ n: 'سر الختم عثمان الأمين',   t: 'بروفيسور', tier: 'gold' },
{ n: 'محمد شريف أحمد',          t: '',         tier: 'silver' },
{ n: 'عبدالرحمن عثمان الأمين',  t: '',         tier: 'silver' },
{ n: 'مجلة نبض التنجلاب',       t: '',         tier: 'silver', org: true },
{ n: 'مريم حاج',                t: '',         tier: 'bronze' },
{ n: 'نادية محمد حمد بردو',     t: '',         tier: 'bronze' },
{ n: 'عبدالرحمن محمد محجوب',    t: '',         tier: 'bronze' },
{ n: 'عبدالوهاب محمد بابكر',    t: '',         tier: 'bronze' },
{ n: 'إبراهيم محمد ميرغني',     t: '',         tier: 'bronze' },
{ n: 'عبدالإله محمود الخال',    t: '',         tier: 'bronze' },
{ n: 'معاوية يعقوب عبدالرحمن',  t: '',         tier: 'bronze' },
{ n: 'محمود محمد حسن',          t: 'دكتور',    tier: 'bronze' },
{ n: 'أيمن عبدالعال',           t: '',         tier: 'bronze' },
];
export const STORY = [
{ icon: 'heart-handshake', title: 'راعي التطبيق',     text: 'عبدالإله سيد البدوي محمد', patron: true },
{ icon: 'lightbulb',       title: 'فكرة التطبيق',     text: 'عثمان عبدالله عبدون، عضو الرابطة' },
{ icon: 'code-2',          title: 'البرمجة والتنفيذ',  text: 'أكرم محمود الخال، عضو الرابطة' },
{ icon: 'shield-check',    title: 'الملكية',          text: 'رابطة طلاب شبتوت بحري بالجامعات والمعاهد العليا' },
{ icon: 'flag',            title: 'دورة الإطلاق',     text: 'دورة "سواعد البناء" 2026-2027 برئاسة أسامة جمال سعيد مختار' },
];
function patronCard(s) {
return `
      <article class="about-patron" aria-label="${s.title}">
        <span class="about-patron__chip"><span data-icon="${s.icon}"></span>${s.title}</span>
        <h3 class="about-patron__name">${s.text}</h3>
      </article>`;
}
function storyItem(s) {
return `
        <div class="about-story-item">
          <div class="about-story-item__icon"><span data-icon="${s.icon}"></span></div>
          <div class="about-story-item__content">
            <h4>${s.title}</h4>
            <p>${s.text}</p>
          </div>
        </div>`;
}
function tierChip(c) {
const title = c.t ? `<em>${c.t}</em> ` : '';
return `
          <li class="about-contrib__item">${title}${c.n}</li>`;
}
function tierBlock(tier) {
const list = CONTRIBUTORS.filter((c) => c.tier === tier.id);
if (!list.length) return '';
return `
      <section class="about-tier about-tier--${tier.id}" aria-label="${tier.plural}">
        <h4 class="about-tier__head">
          <span class="about-tier__medal"><span data-icon="medal"></span></span>
          <span class="about-tier__title">${tier.plural}</span>
          <span class="about-tier__count">${list.length}</span>
        </h4>
        <ul class="about-contrib about-contrib--card">${list.map(tierChip).join('')}
        </ul>
      </section>`;
}
export function renderAboutApp() {
return `
    <section class="page privacy-page about-app-page">

      <div class="privacy-hero privacy-hero--about">
        <div class="privacy-hero__icon privacy-hero__icon--logo privacy-hero__icon--logo-lg">
          <span class="about-logo-mark" role="img" aria-label="شعار أخضر شبتوت بحري"></span>
        </div>
      </div>

      <div class="appearance-section-label">الرعاية والفكرة</div>${STORY.filter((s) => s.patron).map(patronCard).join('')}
      <div class="about-story-list">${STORY.filter((s) => !s.patron).map(storyItem).join('')}
      </div>

      <div class="appearance-section-label">مساهمات المحتوى</div>
      <p class="about-contrib__hint">أسهموا بالمعلومات والذكريات والصور، وهذه شارات الشكر بحسب حجم المساهمة</p>${TIERS.map(tierBlock).join('')}

    </section>
  `;
}
export function initAboutApp() {}
