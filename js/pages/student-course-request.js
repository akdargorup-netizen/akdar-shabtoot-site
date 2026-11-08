import { DEFAULT_CONTACT_RECIPIENTS } from '../data/contact-recipients-data.js';
import { showToast } from '../shared/toast.js';
import { renderIcons } from '../shared/icons.js';
const DRAFT_KEY    = 'akdar-course-request-draft';
const NAME_MAX     = 100;
const STAGES       = ['الشهادة المتوسطة', 'الشهادة السودانية'];
let _recipients = null;
export function renderCourseRequestBox() {
return `
    <section class="student-ask" id="course-ask">

      <div class="student-ask__box" id="course-form">
        <header class="student-ask__head">
          <span class="student-ask__badge" aria-hidden="true"><span data-icon="graduation-cap"></span></span>
          <div class="student-ask__head-text">
            <h3 class="student-ask__title">طلب كورس الدفعة</h3>
            <p class="student-ask__sub">من الأمانة الأكاديمية — كورس شامل لكل دفعة كل عام</p>
          </div>
        </header>

        <div class="student-ask__field">
          <span class="student-ask__label" id="course-stage-label">اختر المرحلة</span>
          <div class="student-ask__chips" id="course-stages" role="radiogroup" aria-labelledby="course-stage-label">
            ${STAGES.map((st) => `
              <label class="student-ask__chip">
                <input type="radio" name="course-stage" value="${st}">
                <span>${st}</span>
              </label>`).join('')}
          </div>
        </div>

        <div class="student-ask__field">
          <label class="student-ask__label" for="course-name">اسمك</label>
          <input class="student-ask__name" type="text" id="course-name" maxlength="${NAME_MAX}"
            autocomplete="name" enterkeyhint="send" placeholder="اكتب اسمك">
        </div>

        <button class="student-ask__send" id="course-submit-btn" type="button">
          <span data-icon="send"></span>
          إرسال الطلب
        </button>

        <p class="input-error-msg hidden" id="course-error"></p>
      </div>

      <div class="contact-success hidden" id="course-success">
        <div class="contact-success__icon"><span data-icon="check-circle-2"></span></div>
        <h3>وصل طلبك</h3>
        <p>أكمل إرسال الرسالة في الواتساب، وستردّ عليك الأمانة الأكاديمية هناك.</p>
        <a class="btn btn--secondary btn--sm" id="course-wa-fallback" target="_blank" rel="noopener">
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
type: 'course_request',
body,
authorName: (user && !user.isAnonymous) ? user.displayName : null,
});
} catch (err) {
console.error('[StudentCourseRequest] ما قدرنا نسجّل الطلب في الرسائل الواردة (واتساب لسع شغّال):', err);
}
}
async function _knownName() {
try {
const { getCurrentUser } = await import('../data/auth.js');
const user = getCurrentUser();
return (user && !user.isAnonymous && user.displayName) ? String(user.displayName) : '';
} catch {
return '';
}
}
export async function initCourseRequestBox() {
_recipients = null;
_loadRecipients();
const nameEl  = document.getElementById('course-name');
const errorEl = document.getElementById('course-error');
const stageEls = [...document.querySelectorAll('input[name="course-stage"]')];
if (!nameEl || !stageEls.length) return;
const currentStage = () => stageEls.find(el => el.checked)?.value || '';
const persist = () => _saveDraft({ name: nameEl.value, stage: currentStage() });
const draft = _readDraft();
nameEl.value = draft.name || '';
stageEls.forEach(el => { el.checked = el.value === draft.stage; });
nameEl.addEventListener('input', persist);
stageEls.forEach(el => el.addEventListener('change', persist));
if (!nameEl.value) {
const known = await _knownName();
if (known && !nameEl.value && nameEl.isConnected) nameEl.value = known;
}
const stagesEl = document.getElementById('course-stages');
const showError = (msg, field) => {
errorEl.textContent = msg;
errorEl.classList.remove('hidden');
field?.setAttribute('data-invalid', '');
};
const clearError = () => {
errorEl.classList.add('hidden');
stagesEl?.removeAttribute('data-invalid');
nameEl.removeAttribute('data-invalid');
};
stageEls.forEach(el => el.addEventListener('change', clearError));
nameEl.addEventListener('input', clearError);
nameEl.addEventListener('keydown', (e) => {
if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); document.getElementById('course-submit-btn')?.click(); }
});
document.getElementById('course-submit-btn')?.addEventListener('click', () => {
clearError();
const name = nameEl.value.trim().replace(/\s+/g, ' ');
const stage = currentStage();
if (!stage) { showError('اختر المرحلة', stagesEl); return; }
if (!name) { showError('اكتب اسمك', nameEl); nameEl.focus(); return; }
const body = [
'*طلب كورس من الأمانة الأكاديمية*',
'',
`الاسم: ${name}`,
`المرحلة: ${stage}`,
].join('\n');
_recordInbox(body);
const recipients = _recipients || { ...DEFAULT_CONTACT_RECIPIENTS };
const number = String(recipients.contributionWhatsapp || '').replace(/\D/g, '');
const waLink = `https://wa.me/${number}?text=${encodeURIComponent(body)}`;
window.open(waLink, '_blank', 'noopener');
const fallback = document.getElementById('course-wa-fallback');
if (fallback) fallback.href = waLink;
_clearDraft();
document.getElementById('course-form')?.classList.add('hidden');
document.getElementById('course-success')?.classList.remove('hidden');
renderIcons();
showToast('جهزنا طلبك للواتساب', 'success');
});
renderIcons();
}
