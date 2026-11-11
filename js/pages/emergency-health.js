import { getContactCategoriesWithContacts } from '../data/contact-directory-data.js';
import { addInboxMessage } from '../data/db.js';
import { getCurrentUser } from '../data/auth.js';
import { errorState, bindErrorRetry } from '../shared/error-state.js';
import { showToast } from '../shared/toast.js';
import { SubmissionGuardError } from '../shared/submission-guard.js';
import { escapeHtml } from '../shared/sanitize.js';
import { renderIcons } from '../shared/icons.js';
const EMERGENCY_KEY = 'emergency';
function _failMessage(err, base) {
if (err instanceof SubmissionGuardError) return err.message;
const raw = err?.code || `${err?.name || ''}-${err?.message || ''}`;
const code = String(raw).replace(/[^\w/-]/g, '').slice(0, 40);
return code ? `${base} (${code})` : base;
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
function renderContactsSkeleton() {
return `
    <article class="contact-card emergency-card" style="pointer-events:none;">
      <div class="skeleton-line skeleton-line--lg" style="width:60%;"></div>
      <div class="skeleton-line" style="width:80%;"></div>
      <div class="skeleton-line" style="width:70%;"></div>
    </article>
  `;
}
export function renderEmergencyHealth() {
return `
    <section class="page emergency-health-page">

      <div class="contact-category-header emergency-health-header">
        <span class="contact-category-header__icon" data-icon="siren"></span>
        <p class="contact-category-header__count">أول جهة تتصل بيها وقت الحاجة</p>
      </div>

      <!-- جهات الطوارئ والصحة — نفس الجهات ونفس الشكل الموجودين في دليل الاتصال -->
      <div class="contact-sections" id="emergency-health-contacts">
        ${renderContactsSkeleton()}
      </div>

      <!-- ميزة: محتاج متبرع بالدم؟ -->
      <article class="emergency-feature-card">
        <div class="emergency-feature-card__head" id="blood-donor-head">
          <span class="emergency-feature-card__icon" data-icon="droplet"></span>
          <div class="emergency-feature-card__body">
            <h3 class="emergency-feature-card__title">محتاج متبرع بالدم؟</h3>
            <p class="emergency-feature-card__text">ابحث عن متبرع بسرعة — طلبك حيتنشر كإعلان داخل التطبيق.</p>
          </div>
        </div>

        <button class="cta-button cta-button--full" id="blood-donor-toggle-btn" type="button">
          <span data-icon="search"></span>
          فتش عن متبرع الآن
        </button>

        <div class="emergency-inline-form hidden" id="blood-donor-form">
          <div class="input-group">
            <label class="input-label input-label--required" for="blood-type-input">فصيلة الدم المطلوبة</label>
            <select class="input" id="blood-type-input">
              <option value="">اختار الفصيلة</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div class="input-group">
            <label class="input-label input-label--required" for="blood-patient-input">اسم المريض أو الحالة</label>
            <input class="input" id="blood-patient-input" type="text" maxlength="80" placeholder="مثلاً: محمد أحمد" />
          </div>

          <div class="input-group">
            <label class="input-label input-label--required" for="blood-phone-input">رقم هاتف أهل المريض</label>
            <input class="input" id="blood-phone-input" type="tel" maxlength="20" placeholder="+249..." />
          </div>

          <div class="input-group">
            <label class="input-label" for="blood-location-input">مكان التبرع (المستشفى أو المركز الصحي)</label>
            <input class="input" id="blood-location-input" type="text" maxlength="80" placeholder="اختياري" />
          </div>

          <button class="cta-button cta-button--full" id="blood-donor-submit-btn" type="button">
            <span data-icon="send"></span>
            إرسال طلب إعلان
          </button>
        </div>

        <div class="contact-success hidden" id="blood-donor-success">
          <div class="contact-success__icon"><span data-icon="check-circle-2"></span></div>
          <h3>وصل طلبك!</h3>
          <p>حنراجعه وننشره كإعلان في التطبيق أسرع ما يمكن — وربنا يعافي المريض.</p>
        </div>
      </article>

      <!-- ميزة: حالة مرضية مستعجلة — إعلان جمع تبرعات -->
      <article class="emergency-feature-card">
        <div class="emergency-feature-card__head" id="donation-head">
          <span class="emergency-feature-card__icon" data-icon="hand-coins"></span>
          <div class="emergency-feature-card__body">
            <h3 class="emergency-feature-card__title">حالة مرضية مستعجلة؟</h3>
            <p class="emergency-feature-card__text">أرسل إعلان جمع تبرعات مع رقم الحساب وهاتف الأهل.</p>
          </div>
        </div>

        <button class="cta-button cta-button--full" id="donation-toggle-btn" type="button">
          <span data-icon="megaphone"></span>
          إرسال إعلان جمع تبرعات
        </button>

        <div class="emergency-inline-form hidden" id="donation-form">
          <div class="input-group">
            <label class="input-label input-label--required" for="donation-case-input">وصف الحالة</label>
            <textarea
              class="input"
              id="donation-case-input"
              rows="3"
              maxlength="400"
              placeholder="اشرح الحالة المرضية باختصار..."
            ></textarea>
          </div>

          <div class="input-group">
            <label class="input-label input-label--required" for="donation-entity-input">اسم الجهة الجامعة للتبرعات</label>
            <input class="input" id="donation-entity-input" type="text" maxlength="80" placeholder="مثلاً: لجنة القرية" />
          </div>

          <div class="input-group">
            <label class="input-label input-label--required" for="donation-account-input">رقم حساب البنك الخاص بالجهة الجامعة للتبرعات</label>
            <input class="input" id="donation-account-input" type="text" maxlength="40" placeholder="رقم الحساب البنكي" />
          </div>

          <div class="input-group">
            <label class="input-label input-label--required" for="donation-phone-input">رقم هاتف أهل المريض</label>
            <input class="input" id="donation-phone-input" type="tel" maxlength="20" placeholder="+249..." />
          </div>

          <button class="cta-button cta-button--full" id="donation-submit-btn" type="button">
            <span data-icon="send"></span>
            إرسال إعلان جمع التبرعات
          </button>
        </div>

        <div class="contact-success hidden" id="donation-success">
          <div class="contact-success__icon"><span data-icon="check-circle-2"></span></div>
          <h3>وصل الإعلان!</h3>
          <p>حنراجعه وننشره في التطبيق ليقدر أهل البلد يساهموا بسرعة.</p>
        </div>
      </article>

    </section>
  `;
}
export async function initEmergencyHealth() {
const page = document.querySelector('.emergency-health-page');
if (!page) return;
await _loadContacts(page);
_bindToggle(page, 'blood-donor-toggle-btn', 'blood-donor-form');
_bindToggle(page, 'donation-toggle-btn', 'donation-form');
_bindBloodDonorForm(page);
_bindDonationForm(page);
}
async function _loadContacts(page) {
const container = page.querySelector('#emergency-health-contacts');
if (!container) return;
try {
const categories = await getContactCategoriesWithContacts();
const emergency = categories.find(c => c.key === EMERGENCY_KEY);
const contacts = emergency?.contacts || [];
container.innerHTML = `
      <article class="contact-card emergency-card">
        <div class="contact-card-header">
          <span class="contact-icon" data-icon="${emergency?.icon || 'siren'}"></span>
          <h3 class="contact-title">${escapeHtml(emergency?.label || 'الطوارئ والصحة')}</h3>
        </div>
        <div class="contact-rows">${contacts.length
? contacts.map(renderRow).join('')
: `<div class="contact-empty">
               <span data-icon="phone-off"></span>
               <p>لسع ما اتضافت أرقام طوارئ هنا — لو الحالة مستعجلة اتصل بالإسعاف أو أقرب مركز صحي.</p>
             </div>`}</div>
      </article>
    `;
renderIcons(container);
container.querySelectorAll('[data-no-phone]').forEach(btn => {
btn.addEventListener('click', () => showToast('الرقم لسه ما اتضاف', 'info'));
});
} catch (err) {
console.error('[EmergencyHealth] فشل تحميل جهات الطوارئ:', err);
container.innerHTML = errorState({ subject: 'جهات الطوارئ' });
renderIcons(container);
bindErrorRetry(container, () => _loadContacts(page));
}
}
function _bindToggle(page, btnId, formId) {
const btn = page.querySelector(`#${btnId}`);
const form = page.querySelector(`#${formId}`);
if (!btn || !form) return;
btn.addEventListener('click', () => {
form.classList.toggle('hidden');
if (!form.classList.contains('hidden')) {
form.querySelector('input, select, textarea')?.focus();
}
});
}
function _authorName() {
const user = getCurrentUser();
return (user && !user.isAnonymous) ? user.displayName : null;
}
function _bindBloodDonorForm(page) {
const submitBtn = page.querySelector('#blood-donor-submit-btn');
if (!submitBtn) return;
submitBtn.addEventListener('click', async () => {
const bloodType = page.querySelector('#blood-type-input')?.value.trim();
const patient   = page.querySelector('#blood-patient-input')?.value.trim();
const phone     = page.querySelector('#blood-phone-input')?.value.trim();
const location  = page.querySelector('#blood-location-input')?.value.trim();
if (!bloodType || !patient || !phone) {
showToast('عبّي فصيلة الدم واسم الحالة ورقم تلفون الأهل', 'error');
return;
}
const bodyLines = [
`محتاج متبرع بالدم — فصيلة ${bloodType}`,
`الحالة: ${patient}`,
`رقم هاتف أهل المريض: ${phone}`,
];
if (location) bodyLines.push(`مكان التبرع: ${location}`);
submitBtn.disabled = true;
try {
await addInboxMessage({
type: 'blood_donor_request',
body: bodyLines.join('\n'),
authorName: _authorName(),
});
page.querySelector('#blood-donor-head')?.classList.add('hidden');
page.querySelector('#blood-donor-form')?.classList.add('hidden');
page.querySelector('#blood-donor-toggle-btn')?.classList.add('hidden');
page.querySelector('#blood-donor-success')?.classList.remove('hidden');
} catch (err) {
console.error('[EmergencyHealth] فشل إرسال طلب متبرع الدم:', err);
showToast(_failMessage(err, 'الطلب لسع ما وصل — جرّب تاني، ولو الأمر عاجل اتصل مباشرة'), 'error');
} finally {
submitBtn.disabled = false;
}
});
}
function _bindDonationForm(page) {
const submitBtn = page.querySelector('#donation-submit-btn');
if (!submitBtn) return;
submitBtn.addEventListener('click', async () => {
const caseDesc = page.querySelector('#donation-case-input')?.value.trim();
const entity   = page.querySelector('#donation-entity-input')?.value.trim();
const account  = page.querySelector('#donation-account-input')?.value.trim();
const phone    = page.querySelector('#donation-phone-input')?.value.trim();
if (!caseDesc || !entity || !account || !phone) {
showToast('عبّي كل الحقول: وصف الحالة، الجهة الجامعة، رقم الحساب، ورقم تلفون الأهل', 'error');
return;
}
const body = [
`حالة مرضية مستعجلة — إعلان جمع تبرعات`,
`وصف الحالة: ${caseDesc}`,
`الجهة الجامعة للتبرعات: ${entity}`,
`رقم حساب البنك: ${account}`,
`رقم هاتف أهل المريض: ${phone}`,
].join('\n');
submitBtn.disabled = true;
try {
await addInboxMessage({
type: 'medical_donation_request',
body,
authorName: _authorName(),
});
page.querySelector('#donation-head')?.classList.add('hidden');
page.querySelector('#donation-form')?.classList.add('hidden');
page.querySelector('#donation-toggle-btn')?.classList.add('hidden');
page.querySelector('#donation-success')?.classList.remove('hidden');
} catch (err) {
console.error('[EmergencyHealth] فشل إرسال إعلان جمع التبرعات:', err);
showToast(_failMessage(err, 'الإعلان لسع ما اترسل — جرّب تاني'), 'error');
} finally {
submitBtn.disabled = false;
}
});
}
