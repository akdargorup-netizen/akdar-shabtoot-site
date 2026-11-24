import { bindSecretTap } from '../shared/secret-trigger.js';
export const CONTRIBUTORS = [{"n": "مدثر علي آرقاوي", "t": ""}, {"n": "سرالختم عثمان الأمين", "t": "بروفيسور"}, {"n": "خالد عثمان الأمين", "t": ""}, {"n": "عبدالرحمن عثمان الأمين", "t": ""}, {"n": "محمد شريف أحمد", "t": ""}, {"n": "مريم حاج", "t": ""}, {"n": "نادية محمد حمد بردو", "t": ""}, {"n": "عبدالرحمن محمد محجوب", "t": ""}, {"n": "عبدالوهاب محمد بابكر", "t": ""}, {"n": "إبراهيم محمد ميرغني", "t": ""}, {"n": "عبدالإله محمود الخال", "t": ""}, {"n": "معاوية يعقوب عبدالرحمن", "t": ""}, {"n": "محمود محمد حسن", "t": "دكتور"}, {"n": "أيمن عبدالعال", "t": ""}, {"n": "مجلة نبض التنجلاب", "t": ""}];
export const STORY = [
{ icon: 'gem',          title: 'الراعي الماسي',    text: 'عبدالإله سيد محمد البدوي', gold: true },
{ icon: 'lightbulb',    title: 'فكرة التطبيق',     text: 'عثمان عبدالله عبدون، عضو الرابطة' },
{ icon: 'code-2',       title: 'البرمجة والتنفيذ',  text: 'أكرم محمود الخال، عضو الرابطة' },
{ icon: 'shield-check', title: 'الملكية',          text: 'رابطة طلاب شبتوت بحري بالجامعات والمعاهد العليا' },
{ icon: 'flag',         title: 'دورة الإطلاق',     text: 'دورة "سواعد البناء" 2026-2027 برئاسة أسامة جمال سعيد مختار' },
];
function storyItem(s) {
return `
        <div class="about-story-item${s.gold ? ' about-story-item--gold' : ''}">
          <div class="about-story-item__icon"><span data-icon="${s.icon}"></span></div>
          <div class="about-story-item__content">
            <h4>${s.title}</h4>
            <p>${s.text}</p>
          </div>
        </div>`;
}
function contribRow(c) {
const title = c.t ? `<em>${c.t}</em> ` : '';
return `
          <li class="about-contrib__row">
            <span class="about-contrib__av">${c.n.charAt(0)}</span>
            <span class="about-contrib__name">${title}${c.n}</span>
          </li>`;
}
export function renderAboutApp() {
return `
    <section class="page privacy-page about-app-page">

      <div class="privacy-hero privacy-hero--about">
        <div class="privacy-hero__icon privacy-hero__icon--logo privacy-hero__icon--logo-lg">
          <span class="about-logo-mark" role="img" aria-label="شعار أخضر شبتوت بحري"></span>
        </div>
      </div>

      <div class="appearance-section-label">الرعاية والفكرة</div>
      <div class="about-story-list">${STORY.map(storyItem).join('')}
      </div>

      <div class="appearance-section-label">مساهمات المحتوى</div>
      <p class="about-contrib__hint">أسهموا بالمعلومات والذكريات والصور</p>
      <ul class="about-contrib">${CONTRIBUTORS.map(contribRow).join('')}
      </ul>

      <section class="about-sign">
        <span class="about-sign__rule"></span>
        <p class="about-sign__name">مجموعة أخضر للتنمية والاستثمار</p>
      </section>

    </section>
  `;
}
let _unbindSecretTap = null;
export function initAboutApp() {
if (_unbindSecretTap) { _unbindSecretTap(); _unbindSecretTap = null; }
const icon = document.querySelector('.about-app-page .privacy-hero__icon');
_unbindSecretTap = bindSecretTap(icon, {
taps: 7,
windowMs: 2000,
onUnlock: async () => {
const { navigateTo } = await import('../core/router.js');
navigateTo('admin');
},
});
}
