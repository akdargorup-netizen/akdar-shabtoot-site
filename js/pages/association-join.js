import { DEFAULT_CONTACT_RECIPIENTS } from '../data/contact-recipients-data.js';
import { navigateTo } from '../core/router.js';
import { showToast } from '../shared/toast.js';
import { renderIcons } from '../shared/icons.js';
const DRAFT_KEY = 'akdar-join-draft';
const NAME_MAX  = 100;
const STAGE_MAX = 200;
let _recipients = null;
export function renderAssociationJoin() {
return `
    <section class="page contact-admin-page association-join-page">

      <div class="contact-admin-intro" id="join-intro">
        <p class="contact-admin-intro__sub">
          املأ البيانات التالية وسيصل طلبك إلى الرابطة عبر الواتساب، وتردّ عليك بنفسها.
        </p>
      </div>

      <div class="contact-form-card" id="join-form">

        <div class="input-group">
          <label class="input-label input-label--required" for="join-name">الاسم رباعي</label>
          <input class="input" type="text" id="join-name" maxlength="${NAME_MAX}" autocomplete="name" placeholder="الاسم الأول والثاني والثالث والرابع">
        </div>

        <div class="input-group">
          <label class="input-label input-label--required" for="join-stage">أين وصلت في المرحلة الدراسية؟</label>
          <input class="input" type="text" id="join-stage" maxlength="${STAGE_MAX}" placeholder="مثال: السنة الثالثة — كلية كذا — جامعة كذا">
        </div>

        <div class="join-check-row">
          <span>أقبل وأتبع دستور ولوائح الرابطة المنظِّمة</span>
          <label class="switch">
            <input type="checkbox" id="join-accept">
            <span class="switch__track"></span>
          </label>
        </div>

        <div class="join-check-row">
          <span>أنا من مطوانيين شبتوت بحري</span>
          <label class="switch">
            <input type="checkbox" id="join-matwan">
            <span class="switch__track"></span>
          </label>
        </div>

        <div class="join-regs">
          <button type="button" class="btn btn--ghost btn--sm" id="join-regs-btn">
            <span data-icon="scroll-text"></span>
            اطّلع على الدستور واللوائح
          </button>
          <p class="input-hint">اختياري ولا يمنع إكمال الاستمارة، لكن ننصحك بقراءتها قبل الإرسال. ما كتبته هنا يبقى محفوظًا حتى ترجع.</p>
        </div>

        <p class="input-error-msg hidden" id="join-error"></p>

        <button class="cta-button cta-button--full" id="join-submit-btn" type="button">
          <span data-icon="send"></span>
          إرسال الطلب
        </button>
      </div>

      <div class="contact-success hidden" id="join-success">
        <div class="contact-success__icon"><span data-icon="check-circle-2"></span></div>
        <h3>وصل طلبك</h3>
        <p>أكمل إرسال الرسالة في الواتساب، وستردّ عليك الرابطة هناك.</p>
        <a class="btn btn--secondary btn--sm" id="join-wa-fallback" target="_blank" rel="noopener">
          لو ما انفتح الواتساب اضغط هنا
        </a>
      </div>

    </section>
  `;
}
function _readDraft() {
try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); } catch { return {}; }
}
function _saveDraft(d) {
try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {   }
}
function _clearDraft() {
try { sessionStorage.removeItem(DRAFT_KEY); } catch {   }
}
async function _loadRecipients() {
try {
const { getContactRecipients } = await import('../data/db.js');
_recipients = await getContactRecipients();
} catch {
_recipients = { ...DEFAULT_CONTACT_RECIPIENTS };
}
}
async function _recordInbox(body) {
try {
const [{ addInboxMessage }, { getCurrentUser }] = await Promise.all([
import('../data/db.js'),
import('../data/auth.js'),
]);
const user = getCurrentUser();
await addInboxMessage({
type: 'join_request',
body,
authorName: (user && !user.isAnonymous) ? user.displayName : null,
});
} catch (err) {
console.error('[AssociationJoin] ما قدرنا نسجّل الطلب في الرسائل الواردة (واتساب لسع شغّال):', err);
}
}
export function initAssociationJoin() {
_recipients = null;
_loadRecipients();
const nameEl   = document.getElementById('join-name');
const stageEl  = document.getElementById('join-stage');
const acceptEl = document.getElementById('join-accept');
const matwanEl = document.getElementById('join-matwan');
const errorEl  = document.getElementById('join-error');
if (!nameEl) return;
const draft = _readDraft();
nameEl.value        = draft.name  || '';
stageEl.value       = draft.stage || '';
acceptEl.checked    = Boolean(draft.accept);
matwanEl.checked    = Boolean(draft.matwan);
const persist = () => _saveDraft({
name: nameEl.value, stage: stageEl.value,
accept: acceptEl.checked, matwan: matwanEl.checked,
});
[nameEl, stageEl].forEach(el => el.addEventListener('input', persist));
[acceptEl, matwanEl].forEach(el => el.addEventListener('change', persist));
const showError = (msg) => { errorEl.textContent = msg; errorEl.classList.remove('hidden'); };
const clearError = () => errorEl.classList.add('hidden');
document.getElementById('join-regs-btn')?.addEventListener('click', () => {
persist();
navigateTo('association-regulations');
});
document.getElementById('join-submit-btn')?.addEventListener('click', () => {
clearError();
const name  = nameEl.value.trim().replace(/\s+/g, ' ');
const stage = stageEl.value.trim();
if (name.split(' ').length < 4) {
showError('اكتب اسمك رباعي (أربعة أسماء على الأقل)');
nameEl.focus();
return;
}
if (!stage) {
showError('اكتب أين وصلت في المرحلة الدراسية');
stageEl.focus();
return;
}
if (!acceptEl.checked) {
showError('لازم تقبل دستور ولوائح الرابطة عشان نكمل الطلب');
return;
}
const body = [
'*طلب انضمام للرابطة*',
'',
`الاسم: ${name}`,
`المرحلة الدراسية: ${stage}`,
`من مطوانيين شبتوت بحري: ${matwanEl.checked ? 'نعم' : 'لا'}`,
'أقرّ بقبول واتباع دستور ولوائح الرابطة: نعم',
].join('\n');
_recordInbox(body);
const recipients = _recipients || { ...DEFAULT_CONTACT_RECIPIENTS };
const number = String(recipients.contributionWhatsapp || '').replace(/\D/g, '');
const waLink = `https://wa.me/${number}?text=${encodeURIComponent(body)}`;
window.open(waLink, '_blank', 'noopener');
const fallback = document.getElementById('join-wa-fallback');
if (fallback) fallback.href = waLink;
_clearDraft();
document.getElementById('join-intro')?.classList.add('hidden');
document.getElementById('join-form')?.classList.add('hidden');
document.getElementById('join-success')?.classList.remove('hidden');
renderIcons();
showToast('جهزنا طلبك للواتساب', 'success');
});
}
