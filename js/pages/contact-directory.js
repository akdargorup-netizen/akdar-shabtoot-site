import {
getContactIndexItems,
getContactCategoriesWithContacts,
} from '../data/contact-directory-data.js';
import { openContactCategory } from './contact-category.js';
import { errorState, bindErrorRetry } from '../shared/error-state.js';
import { escapeHtml } from '../shared/sanitize.js';
import { showToast } from '../shared/toast.js';
import { renderIcons } from '../shared/icons.js';
import { prepareQuery, buildKey, matchesKey } from '../shared/arabic-search.js';
function waLink(phone) {
return `https://wa.me/${phone.replace(/\D/g, '')}`;
}
function searchKey(contact) {
return buildKey(contact.name, contact.role, (contact.phone || '').replace(/\D/g, ''));
}
function renderRow(contact) {
const name = escapeHtml(contact.name);
const hasPhone = !!contact.phone;
const actionsHtml = hasPhone ? `
        <a class="contact-row__call" href="tel:${escapeHtml(contact.phone)}" aria-label="اتصال بـ ${name}">
          <span data-icon="phone"></span>
          <span>اتصال</span>
        </a>
        <a class="contact-row__wa" href="${escapeHtml(waLink(contact.phone))}" target="_blank" rel="noopener" aria-label="واتساب ${name}">
          <span data-icon="message-circle"></span>
        </a>
  ` : `
        <button type="button" class="contact-row__call contact-row__call--disabled" data-no-phone aria-label="لم يتم إضافة رقم لـ ${name} بعد">
          <span data-icon="phone"></span>
          <span>اتصال</span>
        </button>
  `;
return `
    <div class="contact-row" data-search="${escapeHtml(searchKey(contact))}">
      <div class="contact-row__info">
        <span class="contact-row__name">${name}</span>
        ${contact.role ? `<span class="contact-row__role">${escapeHtml(contact.role)}</span>` : ''}
      </div>
      <div class="contact-row__actions">
        ${actionsHtml}
      </div>
    </div>
  `;
}
function renderGroupCard(item) {
const variantClass = item.variant === 'emergency' ? ' contact-group-card--emergency' : '';
return `
    <div class="contact-group-card${variantClass}" data-group="${item.key}">
      <div class="contact-group-card__icon" data-icon="${item.icon}"></div>
      <div class="contact-group-card__body">
        <div class="contact-group-card__top">
          <span class="contact-group-card__title">${escapeHtml(item.label)}</span>
          <span class="contact-group-card__count">${item.contacts.length}</span>
        </div>
        ${item.description ? `<p class="contact-group-card__desc">${escapeHtml(item.description)}</p>` : ''}
      </div>
      <div class="contact-group-card__arrow" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 6L7 10L11 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}
function renderSearchCategoryCard(cat) {
return `
    <article class="contact-card" data-search-cat="${cat.key}" data-search-title="${escapeHtml(buildKey(cat.label))}">
      <div class="contact-card-header">
        <span class="contact-icon" data-icon="${cat.icon}"></span>
        <h3 class="contact-title">${escapeHtml(cat.label)}</h3>
      </div>
      <div class="contact-rows">
        ${cat.contacts.map(renderRow).join('')}
      </div>
    </article>
  `;
}
function renderGridSkeleton(n) {
return Array.from({ length: n }).map(() => `
    <div class="contact-group-card" style="pointer-events:none;">
      <div class="skeleton-line skeleton-line--lg" style="width:60%;"></div>
      <div class="skeleton-line" style="width:80%;"></div>
    </div>
  `).join('');
}
export function renderContactDirectory() {
return `
    <section class="page contact-directory-page">

      <!-- Search -->
      <div class="contact-search-wrap">
        <div class="search-bar">
          <span class="search-bar__icon" data-icon="search"></span>
          <input
            type="text"
            id="contact-search-input"
            class="search-bar__input"
            placeholder="فتش عن زول أو خدمة أو رقم"
            autocomplete="off"
            disabled
          />
        </div>
      </div>

      <!-- فهرس الفئات: بطاقة لكل فئة (حتى الطوارئ) تفتح صفحة تفاصيل مستقلة -->
      <div class="contact-group-grid" id="contact-group-grid">
        ${renderGridSkeleton(5)}
      </div>

      <!-- نتيجة البحث — مقسّمة على بطاقات حسب الفئة الأصلية (مخفية إلا وقت الكتابة) -->
      <section class="contact-sections" id="contact-search-results" hidden></section>

      <!-- Empty state (search) -->
      <div class="contact-empty" id="contact-empty" hidden>
        <span data-icon="search-x"></span>
        <p>ما لقينا جهة بهذا الاسم — جرّب اسم مختصر أو تصنيف تاني</p>
      </div>

      <!-- Suggest a missing contact -->
      <div class="contact-suggest">
        <p>ذكّرونا لو نسينا أي خدمة أو جهة ممكن تفيد أهل البلد.</p>
        <button class="contact-suggest__btn" data-action="contact-admin">
          <span data-icon="plus-circle"></span>
          اقترح جهة
        </button>
      </div>

    </section>
  `;
}
export async function initContactDirectory() {
const groupGrid = document.getElementById('contact-group-grid');
const resultsSection = document.getElementById('contact-search-results');
const input = document.getElementById('contact-search-input');
let items = [];
let categories = [];
try {
[items, categories] = await Promise.all([
getContactIndexItems(),
getContactCategoriesWithContacts(),
]);
} catch (err) {
console.error('[ContactDirectory] فشل تحميل دليل الاتصال:', err);
if (groupGrid) {
groupGrid.innerHTML = errorState({ subject: 'دليل الاتصال' });
renderIcons(groupGrid);
bindErrorRetry(groupGrid, initContactDirectory);
}
return;
}
if (groupGrid) groupGrid.innerHTML = items.map(renderGroupCard).join('');
if (resultsSection) resultsSection.innerHTML = categories.map(renderSearchCategoryCard).join('');
renderIcons();
document.querySelectorAll('.contact-group-card[data-group]').forEach(card => {
card.addEventListener('click', () => {
const item = items.find(i => i.key === card.dataset.group);
if (item) openContactCategory(item);
});
});
if (resultsSection) {
resultsSection.addEventListener('click', (e) => {
if (e.target.closest('[data-no-phone]')) {
showToast('الرقم لسه ما اتضاف', 'info');
}
});
}
if (!input) return;
input.disabled = false;
const emptyStateEl = document.getElementById('contact-empty');
const resultCards = resultsSection ? resultsSection.querySelectorAll('.contact-card[data-search-cat]') : [];
input.addEventListener('input', () => {
const pq = prepareQuery(input.value);
const isSearching = !pq.isEmpty;
if (groupGrid)      groupGrid.hidden      = isSearching;
if (resultsSection) resultsSection.hidden = !isSearching;
if (!isSearching) {
if (emptyStateEl) emptyStateEl.hidden = true;
return;
}
let anyVisible = false;
resultCards.forEach(card => {
const rows = card.querySelectorAll('.contact-row');
let cardHasMatch = false;
const titleMatch = matchesKey(card.dataset.searchTitle || '', pq);
rows.forEach(row => {
const match = titleMatch || matchesKey(row.dataset.search, pq);
row.hidden = !match;
if (match) cardHasMatch = true;
});
card.hidden = !cardHasMatch;
if (cardHasMatch) anyVisible = true;
});
if (emptyStateEl) emptyStateEl.hidden = anyVisible;
});
}
