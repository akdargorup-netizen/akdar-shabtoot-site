const COPY = {
idea: {
icon: 'heart-handshake',
title: 'جزاك الله خيرًا على مساهمتك',
text: 'فكرتك تحت مراجعة المشرفين، سنراجعها وننشرها في أقرب وقت.',
},
occasion: {
icon: 'sparkles',
title: 'شكرًا لمشاركة مناسبتك',
text: 'سننشرها في أقرب وقت بعد مراجعتها.',
},
};
export function renderReviewNotice(kind, id) {
const c = COPY[kind];
return `
    <article class="review-notice review-notice--${kind}" data-review-notice="${kind}" data-${kind}-notice-id="${id}" role="status">
      <span class="review-notice__icon" aria-hidden="true"><i data-icon="${c.icon}"></i></span>
      <h3 class="review-notice__title">${c.title}</h3>
      <p class="review-notice__text">${c.text}</p>
    </article>
  `;
}
