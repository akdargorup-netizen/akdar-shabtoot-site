export function emptyState({ icon = 'inbox', title, desc = '' }) {
return `
    <div class="empty-state" role="status" aria-label="${title}">
      <i class="empty-state__icon" data-lucide="${icon}"></i>
      <p class="empty-state__title">${title}</p>
      ${desc ? `<p class="empty-state__description">${desc}</p>` : ''}
    </div>
  `;
}
export function syncFilterEmpty(feed, cardSelector, opts = {}) {
if (!feed) return false;
feed.querySelector('[data-filter-empty]')?.remove();
const cards = Array.from(feed.querySelectorAll(cardSelector));
if (!cards.length) return false;
const anyVisible = cards.some(card => !card.hidden && card.style.display !== 'none');
if (anyVisible) return false;
feed.insertAdjacentHTML('beforeend', `
    <div data-filter-empty>
      ${emptyState({ icon: 'search-x', ...opts })}
    </div>
  `);
return true;
}
