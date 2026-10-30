import { DEFAULT_CONTACT_RECIPIENTS } from '../data/contact-recipients-data.js';
let _recipientsCache = null;
async function _getRecipients() {
if (_recipientsCache) return _recipientsCache;
try {
const { getContactRecipients } = await import('../data/db.js');
_recipientsCache = await getContactRecipients();
return _recipientsCache;
} catch {
return { ...DEFAULT_CONTACT_RECIPIENTS };
}
}
export function renderContribute() {
return `
    <section class="page contact-admin-page">

      <div class="contact-admin-intro">
        <p class="contact-admin-intro__sub">
          شاركنا ما عندك — صور قديمة، قصص، معلومات، وثائق.
          كل مساهمة تُثري ذاكرة شبتوت بحري.
        </p>
      </div>

      <div class="contact-form-card">
        <div class="input-group">
          <label class="input-label" for="contribute-body">شنو عندك تشاركنا؟</label>
          <textarea
            class="input"
            id="contribute-body"
            placeholder="اكتب هنا أو صف ما عندك..."
            rows="5"
            maxlength="1000"
          ></textarea>
          <span class="input-hint"><span id="contribute-char-count">0</span>/1000</span>
        </div>

        <button class="cta-button cta-button--full" id="contribute-submit-btn">
          <span data-icon="message-circle"></span>
          رسلو لينا بالواتساب
        </button>
      </div>

      <div class="contact-success hidden" id="contribute-success">
        <div class="contact-success__icon"><span data-icon="check-circle-2"></span></div>
        <h3>مشكور على مساهمتك!</h3>
        <p>ما شاء الله، المشرف يتواصل معك قريباً على واتساب.</p>
      </div>

    </section>
  `;
}
export function renderReportError() {
return `
    <section class="page contact-admin-page">

      <div class="contact-admin-intro">
        <p class="contact-admin-intro__sub">
          لاحظت غلطة أو معلومة ناقصة؟ قول لينا.
        </p>
      </div>

      <div class="contact-form-card">
        <div class="input-group">
          <label class="input-label" for="report-body">وصف الغلطة أو المعلومة الناقصة</label>
          <textarea
            class="input"
            id="report-body"
            placeholder="اكتب هنا..."
            rows="5"
            maxlength="1000"
          ></textarea>
          <span class="input-hint"><span id="report-char-count">0</span>/1000</span>
        </div>

        <button class="cta-button cta-button--full" id="report-submit-btn">
          <span data-icon="send"></span>
          رسّل
        </button>
      </div>

      <div class="contact-success hidden" id="report-success">
        <div class="contact-success__icon"><span data-icon="check-circle-2"></span></div>
        <h3>وصلت!</h3>
        <p>شكراً، ننظر فيها قريباً.</p>
      </div>

    </section>
  `;
}
let _contactHandler = null;
let _counterHandler = null;
function _initForm(submitId, bodyId, countId, successId, subject, channel) {
if (_contactHandler) {
document.removeEventListener('click', _contactHandler);
_contactHandler = null;
}
_recipientsCache = null;
_getRecipients();
const bodyEl    = document.getElementById(bodyId);
const counterEl = document.getElementById(countId);
if (bodyEl && counterEl) {
if (_counterHandler) bodyEl.removeEventListener('input', _counterHandler);
_counterHandler = () => { counterEl.textContent = bodyEl.value.length; };
bodyEl.addEventListener('input', _counterHandler);
}
_contactHandler = function (e) {
if (e.target.closest(`#${submitId}`)) {
const body = document.getElementById(bodyId)?.value.trim();
if (!body) {
showToast('اكتب تفاصيل رسالتك', 'error');
return;
}
_recordInboxMessage(channel === 'whatsapp' ? 'contribution' : 'error_report', body);
const recipients = _recipientsCache || { ...DEFAULT_CONTACT_RECIPIENTS };
if (channel === 'whatsapp') {
const number = String(recipients.contributionWhatsapp || '').replace(/\D/g, '');
const text = `*${subject}*\n\n${body}`;
const waLink = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
window.open(waLink, '_blank', 'noopener');
} else {
const mailto = `mailto:${recipients.reportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
window.location.href = mailto;
}
document.querySelector('.contact-admin-intro')?.classList.add('hidden');
document.querySelector('.contact-form-card')?.classList.add('hidden');
document.getElementById(successId)?.classList.remove('hidden');
}
};
document.addEventListener('click', _contactHandler);
}
async function _recordInboxMessage(type, body) {
try {
const [{ addInboxMessage }, { getCurrentUser }] = await Promise.all([
import('../data/db.js'),
import('../data/auth.js'),
]);
const user = getCurrentUser();
await addInboxMessage({
type,
body,
authorName: (user && !user.isAnonymous) ? user.displayName : null,
});
} catch (err) {
console.error('[SettingsContact] ما قدرنا نسجّل الرسالة في سجل الإدارة (القناة الأساسية لسع شغالة):', err);
}
}
export function initContribute() {
_initForm('contribute-submit-btn', 'contribute-body', 'contribute-char-count', 'contribute-success', 'مساهمة في التوثيق', 'whatsapp');
}
export function initReportError() {
_initForm('report-submit-btn', 'report-body', 'report-char-count', 'report-success', 'إبلاغ عن خطأ', 'email');
}
function showToast(msg, type = 'success') {
const existing = document.querySelector('.toast');
if (existing) existing.remove();
const toast = document.createElement('div');
toast.className = `toast toast--${type}`;
toast.textContent = msg;
document.body.appendChild(toast);
setTimeout(() => {
toast.classList.add('toast--exit');
setTimeout(() => toast.remove(), 400);
}, 2400);
}
