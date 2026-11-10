import { DEFAULT_CONTACT_RECIPIENTS } from '../data/contact-recipients-data.js';
import { showToast } from '../shared/toast.js';
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
function _page({ sub, bodyId, countId, label, placeholder, btnId, btnIcon, btnText, note, successId, successTitle, successText }) {
return `
    <section class="page contact-admin-page">

      <div class="page-intro contact-admin-intro">
        <p>${sub}</p>
      </div>

      <div class="contact-form-card">
        <div class="input-group">
          <label class="input-label" for="${bodyId}">${label}</label>
          <textarea class="input contact-textarea" id="${bodyId}" placeholder="${placeholder}" rows="6" maxlength="1000"></textarea>
          <span class="contact-counter"><span id="${countId}">0</span>/1000</span>
        </div>

        <button class="cta-button cta-button--full" id="${btnId}">
          <span data-icon="${btnIcon}"></span>
          ${btnText}
        </button>

        <p class="contact-note"><span data-icon="info"></span>${note}</p>
      </div>

      <div class="contact-success hidden" id="${successId}">
        <div class="contact-success__icon"><span data-icon="check-circle-2"></span></div>
        <h3>${successTitle}</h3>
        <p>${successText}</p>
        <button type="button" class="contact-again" data-contact-again>رسالة جديدة</button>
      </div>

    </section>
  `;
}
export function renderContribute() {
return _page({
sub: 'شاركنا ما عندك — صور قديمة، قصص، معلومات، وثائق. كل مساهمة تُثري ذاكرة شبتوت بحري.',
bodyId: 'contribute-body', countId: 'contribute-char-count',
label: 'شنو عندك تشاركنا؟',
placeholder: 'اكتب هنا أو صف ما عندك... (الصور والتسجيلات ترسلها في واتساب بعد ما يفتح)',
btnId: 'contribute-submit-btn', btnIcon: 'message-circle', btnText: 'رسلو لينا بالواتساب',
note: 'بنفتح لك واتساب والرسالة جاهزة — بس تضغط «إرسال» هناك، وتقدر تضيف صور أو تسجيلات.',
successId: 'contribute-success',
successTitle: 'مشكور على مساهمتك!',
successText: 'ما شاء الله، المشرف يتواصل معك قريباً على واتساب.',
});
}
export function renderReportError() {
return _page({
sub: 'لاحظت غلطة أو معلومة ناقصة؟ قول لينا ونصلحها.',
bodyId: 'report-body', countId: 'report-char-count',
label: 'وصف الغلطة أو المعلومة الناقصة',
placeholder: 'اكتب هنا... وين شفت الغلطة وشنو الصح؟',
btnId: 'report-submit-btn', btnIcon: 'send', btnText: 'رسّل',
note: 'بيفتح تطبيق البريد في تلفونك والرسالة جاهزة — بس تضغط «إرسال».',
successId: 'report-success',
successTitle: 'وصلت!',
successText: 'شكراً، ننظر فيها قريباً.',
});
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
if (e.target.closest('[data-contact-again]')) {
const b = document.getElementById(bodyId);
if (b) b.value = '';
if (counterEl) counterEl.textContent = '0';
document.querySelector('.contact-admin-intro')?.classList.remove('hidden');
document.querySelector('.contact-form-card')?.classList.remove('hidden');
document.getElementById(successId)?.classList.add('hidden');
return;
}
if (e.target.closest(`#${submitId}`)) {
const body = document.getElementById(bodyId)?.value.trim();
if (!body) {
showToast('اكتب تفاصيل رسالتك', 'error');
document.getElementById(bodyId)?.focus();
return;
}
_recordInboxMessage(channel === 'whatsapp' ? 'contribution' : 'error_report', body);
const recipients = _recipientsCache || { ...DEFAULT_CONTACT_RECIPIENTS };
if (channel === 'whatsapp') {
const number = String(recipients.contributionWhatsapp || '').replace(/\D/g, '');
const text = `*${subject}*\n${body}`;
const waLink = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
window.open(waLink, '_blank', 'noopener');
} else {
const mailBody = body;
const mailto = `mailto:${recipients.reportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
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
