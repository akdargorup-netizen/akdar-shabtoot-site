import { navigateTo } from '../core/router.js';
import { escapeHtml } from '../shared/sanitize.js';
import { showToast } from '../shared/toast.js';
let currentCategory = null;
export function openContactCategory(category) {
currentCategory = category;
window.__contactCategoryModule = { category };
navigateTo('contact-category');
}
function waLink(phone) {
return `https://wa.me/${phone.replace(/\D/g, '')}`;
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
    <div class="contact-row">
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
function renderSubcategoryCard(sub, emergency) {
const emergencyClass = emergency ? ' emergency-card' : '';
return `
    <article class="contact-card${emergencyClass}" data-subcat="${sub.key}">
      <div class="contact-card-header">
        <span class="contact-icon" data-icon="${sub.icon}"></span>
        <h3 class="contact-title">${escapeHtml(sub.label)}</h3>
      </div>
      <div class="contact-rows" data-subcat-rows="${sub.key}">
        ${sub.contacts.length
? sub.contacts.map(renderRow).join('')
: `<div class="contact-empty">
               <span data-icon="phone-off"></span>
               <p>لسع ما اتضافت جهات في القسم دا</p>
             </div>`}
      </div>
    </article>
  `;
}
export function renderContactCategory() {
const cat = currentCategory;
if (!cat) {
return `
      <section class="page contact-category-page">
        <div class="contact-empty">
          <span data-icon="search-x"></span>
          <p>ما في قسم مفتوح — ارجع لدليل الاتصال واختار قسم</p>
        </div>
      </section>
    `;
}
const isEmergency = cat.variant === 'emergency';
const subcats = cat.categories && cat.categories.length ? cat.categories : [{
key: cat.key, label: cat.label, icon: cat.icon, contacts: cat.contacts,
}];
return `
    <section class="page contact-category-page">
      <div class="contact-category-header">
        <span class="contact-category-header__icon" data-icon="${cat.icon}"></span>
        <p class="contact-category-header__count">${cat.contacts.length} جهة في هذا القسم</p>
      </div>

      <!-- كل جهة داخل بطاقة قسمها الأصلي — ما فيه شيء خارج تنظيم البطاقات -->
      <div class="contact-sections" id="contact-category-sections">
        ${subcats.map(sub => renderSubcategoryCard(sub, isEmergency)).join('')}
      </div>
    </section>
  `;
}
export function initContactCategory() {
document.querySelectorAll('[data-no-phone]').forEach(btn => {
btn.addEventListener('click', () => {
showToast('الرقم لسه ما اتضاف', 'info');
});
});
}
