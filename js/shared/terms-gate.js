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
export function requireTermsAccepted() {
if (hasAcceptedTerms()) return Promise.resolve(true);
if (_open) return _open;
_open = new Promise(resolve => {
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop overlay-backdrop--center';
backdrop.innerHTML = `
      <div class="modal modal--center" role="dialog" aria-modal="true" aria-label="قواعد المجتمع">
        <div class="modal__handle"></div>
        <div class="modal__body" style="text-align:right;line-height:1.9;max-height:60vh;overflow:auto">
          <h3 class="modal__title">قواعد المجتمع</h3>
          <p>قبل ما تشارك في «أخضر شبتوت بحري»، نرجو الالتزام بالآتي. نحن لا نتسامح مع المحتوى المسيء.</p>
          <ul style="padding-inline-start:20px;margin:0 0 10px">
            <li>لا إساءة ولا سباب ولا تحريض على الكراهية أو العنف أو التمييز.</li>
            <li>لا تحرّش ولا تنمّر ولا تشهير بأحد.</li>
            <li>لا محتوى جنسي أو فاضح، ولا شيء غير قانوني.</li>
            <li>لا تنشر معلومات خاصة بغيرك (أرقام، عناوين، صور) بدون إذنه.</li>
            <li>لا إعلانات ولا روابط مضلِّلة ولا انتحال لشخص آخر.</li>
          </ul>
          <p>تقدر تُبلّغ عن أي محتوى مسيء أو تحظر أي عضو من قائمة الخيارات (⋮ أو الضغط المطوّل). تراجع الإدارة البلاغات، وتحذف المخالف وقد تحظر صاحبه.</p>
          <label style="display:flex;gap:10px;align-items:flex-start;margin-top:12px;cursor:pointer">
            <input type="checkbox" id="terms-check" style="margin-top:6px;width:20px;height:20px;flex:none">
            <span>قرأت القواعد وأوافق على الالتزام بها، وأوافق على <a href="https://akdar-shabtoot.web.app/privacy.html" target="_blank" rel="noopener">سياسة الخصوصية</a>.</span>
          </label>
        </div>
        <div class="modal__footer">
          <button class="btn btn--primary btn--full" id="terms-accept" disabled>أوافق وأكمل</button>
          <button class="btn btn--ghost btn--full" id="terms-cancel">إلغاء</button>
        </div>
      </div>
    `;
document.body.appendChild(backdrop);
renderIcons(backdrop);
const check = backdrop.querySelector('#terms-check');
const accept = backdrop.querySelector('#terms-accept');
const finish = ok => { backdrop.remove(); _open = null; resolve(ok); };
check.addEventListener('change', () => { accept.disabled = !check.checked; });
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
