function renderEntryCard({ page, icon, title, desc, variant = '' }) {
return `
    <div class="nlang-index-card${variant ? ` nlang-index-card--${variant}` : ''}" data-page="${page}">
      <div class="nlang-index-card__icon" data-icon="${icon}"></div>
      <div class="nlang-index-card__body">
        <h3 class="nlang-index-card__title">${title}</h3>
        <p class="nlang-index-card__desc">${desc}</p>
      </div>
      <div class="nlang-index-card__arrow" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
          <path d="M11 7L8 10L11 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}
export function renderNubianDictionary() {
const cards = [
{
page:  'nubian-words',
icon:  'languages',
title: 'قاموس الكلمات',
desc:  'كلمات آنداندي مقسّمة على 17 تصنيف، مع بحث فيها كلها',
},
{
page:  'nubian-phrases',
icon:  'message-square',
title: 'تعلم الكلام',
desc:  'جمل وعبارات جاهزة للاستخدام اليومي بآنداندي',
},
{
page:  'nubian-game',
icon:  'gamepad-2',
title: 'لعبة آنداندي',
desc:  'مع آبادول: أسئلة ومطابقة من كلمات القاموس وجمل تعلم الكلام',
variant: 'game',
},
].map(renderEntryCard).join('');
return `
    <section class="page nlang-page">

      <div class="nlang-intro">
        <p>آنداندي — لغة أجدادنا النوبية، محفوظة هنا لتحفظها الأجيال القادمة.</p>
      </div>

      <div class="nlang-index-grid" id="nlang-index-grid">
        ${cards}
      </div>

    </section>
  `;
}
