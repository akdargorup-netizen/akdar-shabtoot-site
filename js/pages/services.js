const ARROW_SVG = `
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 6L7 10L11 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;
function renderServiceCard({ variant = '', icon, title, desc, dataAttrs = '' }) {
const variantClass = variant ? ` service-card--${variant}` : '';
return `
    <article class="service-card${variantClass}" ${dataAttrs}>
      <div class="service-card__icon" data-icon="${icon}"></div>
      <div class="service-card__body">
        <div class="service-card__top">
          <span class="service-card__title">${title}</span>
        </div>
        <p class="service-card__desc">${desc}</p>
      </div>
      <div class="service-card__arrow" aria-hidden="true">${ARROW_SVG}</div>
    </article>
  `;
}
export function renderServices() {
const urgent = [
{
variant: 'emergency', icon: 'siren', title: 'الطوارئ والصحة',
desc: 'أرقام الطوارئ والإسعاف، وطلب متبرع بالدم أو تبرعات لحالة مستعجلة.',
dataAttrs: 'data-page="emergency-health"',
},
];
const village = [
{
icon: 'lightbulb', title: 'مصنع الأفكار',
desc: 'شاركنا فكرة تفيد البلد، وخلّي الناس تأيدها وتناقشها.',
dataAttrs: 'data-page="idea-box"',
},
{
variant: 'featured', icon: 'phone', title: 'دليل البلد',
desc: 'جهات الاتصال والخدمات الأساسية لأبناء القرية.',
dataAttrs: 'data-section="contacts"',
},
{
icon: 'trending-up', title: 'متابعة المشاريع',
desc: 'المشاريع الرسمية الجارية والقادمة وتفاصيلها.',
dataAttrs: 'data-page="development-projects"',
},
{
icon: 'graduation-cap', title: 'خدمات الطلاب',
desc: 'طلب كورس دراسي، حصص فيديو، ونصائح أكاديمية للشهادتين المتوسطة والثانوية.',
dataAttrs: 'data-page="student-services"',
},
];
const fun = [
{
variant: 'fun', icon: 'gamepad-2', title: 'تحدي التنجلاب',
desc: 'أسئلة وتحديات عن البلد وغيرها — اجمع النجوم، وسابق الوقت، وكن البطل.',
dataAttrs: 'data-page="tanjalab"',
},
];
return `
    <section class="page services-page">
      <div class="services-group">
        <h3 class="services-group__label">عاجل</h3>
        <div class="services-sections">
          ${urgent.map(renderServiceCard).join('')}
        </div>
      </div>
      <div class="services-group">
        <h3 class="services-group__label">خدمات القرية</h3>
        <div class="services-sections">
          ${village.map(renderServiceCard).join('')}
        </div>
      </div>
      <div class="services-group">
        <h3 class="services-group__label">ترفيه</h3>
        <div class="services-sections">
          ${fun.map(renderServiceCard).join('')}
        </div>
      </div>
    </section>
  `;
}
export async function initServices() {
const { refreshSectionBadges } = await import('../shared/section-badges.js');
await refreshSectionBadges();
}
