function renderUnderConstruction({ icon, title, desc }) {
return `
    <section class="page uc-page">
      <div class="uc-card" role="status">
        <div class="uc-card__icon" data-icon="${icon}"></div>
        <h2 class="uc-card__title">${title}</h2>
        <p class="uc-card__desc">${desc}</p>
        <span class="uc-card__tag"><i data-icon="hammer"></i> قيد البناء</span>
      </div>
    </section>
  `;
}
export function renderNubianGame() {
return renderUnderConstruction({
icon: 'gamepad-2',
title: 'لعبة آنداندي',
desc: 'لسه بنبنيها — قريب تلقاها هنا بإذن الله.',
});
}
