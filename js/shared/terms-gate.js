import { getCurrentUser } from '../data/auth.js';
import { renderIcons } from './icons.js';
const TERMS_VERSION = 1;
const keyFor = uid => `akdar_terms_v${TERMS_VERSION}:${uid}`;
export function hasAcceptedTerms() {
const uid = getCurrentUser()?.uid;
if (!uid) return false;
try { return !!localStorage.getItem(keyFor(uid)); } catch { return false; }
}
let _open = null;
function showRules() {
const b = document.createElement('div');
b.className = 'overlay-backdrop overlay-backdrop--center';
b.innerHTML = `
    <div class="modal modal--center" role="dialog" aria-modal="true" aria-label="قواعد المجتمع">
      <div class="modal__handle"></div>
      <div class="modal__body" style="text-align:right;line-height:1.8;max-height:62vh;overflow:auto">
        <h3 class="modal__title">قواعد المجتمع</h3>
        <p style="margin:0 0 6px">عشان نحافظ على احترام أهل البلد، نرجو:</p>
        <ul style="padding-inline-start:20px;margin:0 0 8px">
          <li>لا إساءة ولا سباب ولا تحريض.</li>
          <li>لا تنمّر ولا تشهير بأحد.</li>
          <li>لا محتوى فاضح أو مخالف للقانون.</li>
          <li>لا تنشر معلومات غيرك الخاصة.</li>
        </ul>
        <p style="margin:0">تقدر تُبلّغ أو تحظر أي عضو من زر ⋮ . المخالف يُحذف محتواه وقد يُحظر.</p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary btn--full" id="rules-close">فهمت</button>
      </div>
    </div>
  `;
document.body.appendChild(b);
const close = () => b.remove();
b.querySelector('#rules-close').addEventListener('click', close);
b.addEventListener('click', e => { if (e.target === b) close(); });
}
export function requireTermsAccepted() {
if (hasAcceptedTerms()) return Promise.resolve(true);
if (_open) return _open;
_open = new Promise(resolve => {
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop overlay-backdrop--center';
backdrop.innerHTML = `
      <div class="modal modal--center" role="dialog" aria-modal="true" aria-label="قواعد المجتمع">
        <div class="modal__handle"></div>
        <div class="modal__body" style="text-align:right;line-height:1.9">
          <h3 class="modal__title">قبل ما تشارك</h3>
          <p style="margin:0">بالموافقة تلتزم بـ<a href="#" id="terms-rules-link" style="color:var(--text-brand);font-weight:700;text-decoration:underline">قواعد المجتمع</a> وبـ<a href="https://akdar-shabtoot.web.app/privacy.html" target="_blank" rel="noopener" style="color:var(--text-brand);font-weight:700;text-decoration:underline">سياسة الخصوصية</a>.</p>
        </div>
        <div class="modal__footer">
          <button class="btn btn--primary btn--full" id="terms-accept">أوافق وأكمل</button>
          <button class="btn btn--ghost btn--full" id="terms-cancel">إلغاء</button>
        </div>
      </div>
    `;
document.body.appendChild(backdrop);
renderIcons(backdrop);
backdrop.querySelector('#terms-rules-link').addEventListener('click', e => { e.preventDefault(); showRules(); });
const accept = backdrop.querySelector('#terms-accept');
const finish = ok => { backdrop.remove(); _open = null; resolve(ok); };
accept.addEventListener('click', () => {
const uid = getCurrentUser()?.uid;
if (uid) { try { localStorage.setItem(keyFor(uid), String(Date.now())); } catch {   } }
finish(true);
});
backdrop.querySelector('#terms-cancel').addEventListener('click', () => finish(false));
backdrop.addEventListener('click', e => { if (e.target === backdrop) finish(false); });
});
return _open;
}
