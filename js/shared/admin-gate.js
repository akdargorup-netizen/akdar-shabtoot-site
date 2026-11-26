import { unlockAdminSession, isGateConfigured, ADMIN_AUTH_MODE, enterAdminWithClaims } from '../data/admin-auth.js';
import { getCurrentUser, signInWithGoogle, refreshClaims, preloadGoogleSignIn } from '../data/auth.js';
import { escapeHtml } from './sanitize.js';
let _cleanup = null;
export function openAdminGate(onSuccess) {
preloadGoogleSignIn();
closeAdminGate();
if (ADMIN_AUTH_MODE === 'claims') {
_openClaimsGate(onSuccess);
return;
}
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop overlay-backdrop--center';
backdrop.innerHTML = `
    <div class="modal modal--center" role="dialog" aria-modal="true" aria-label="دخول لوحة الإدارة">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">دخول قافل</h3>
      </div>
      <div class="modal__body">
        <div class="input-group">
          <label class="input-label" for="admin-gate-password">كلمة السر</label>
          <input
            class="input"
            id="admin-gate-password"
            type="password"
            autocomplete="off"
            placeholder="••••••••"
          />
          <p class="input-error-msg hidden" id="admin-gate-error">كلمة السر غير صحيحة</p>
          <button class="btn btn--ghost btn--sm" id="admin-gate-forgot" type="button" style="margin-top: var(--space-2);">
            نسيت كلمة السر؟
          </button>
          <div class="input-hint hidden" id="admin-gate-forgot-panel" style="margin-top: var(--space-2);">
            لو نسيت كلمة سر حسابك: اطلب من مطوّر التطبيق يصفّرها لك من
            "صلاحيات المشرفين" داخل لوحة الإدارة. لو ما في زول عنده وصول
            أصلاً (أول مرة أو ضاعت كل الحسابات)، فيه مفتاح استرجاع ثابت
            في الكود نفسه — انظر <code>RECOVERY_PASSWORD_HASH</code> في
            <code>js/data/admin-auth.js</code>.
          </div>
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-gate-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-gate-submit">دخول</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
const passwordEl = backdrop.querySelector('#admin-gate-password');
const errorEl    = backdrop.querySelector('#admin-gate-error');
const close = () => closeAdminGate();
const submit = async () => {
if (!isGateConfigured()) {
errorEl.textContent = 'البوابة غير مُفعّلة بعد';
errorEl.classList.remove('hidden');
return;
}
const role = await unlockAdminSession(passwordEl.value);
if (role) {
close();
onSuccess?.(role);
} else {
errorEl.textContent = 'كلمة السر غير صحيحة';
errorEl.classList.remove('hidden');
passwordEl.value = '';
passwordEl.focus();
}
};
backdrop.querySelector('#admin-gate-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
backdrop.querySelector('#admin-gate-submit').addEventListener('click', submit);
backdrop.querySelector('#admin-gate-forgot').addEventListener('click', () => {
backdrop.querySelector('#admin-gate-forgot-panel').classList.toggle('hidden');
});
passwordEl.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
passwordEl.focus();
_cleanup = () => backdrop.remove();
}
function _openClaimsGate(onSuccess) {
const user = getCurrentUser();
const signedIn = Boolean(user && !user.isAnonymous);
const name = signedIn ? escapeHtml(user.displayName || 'حسابك') : '';
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop overlay-backdrop--center';
backdrop.innerHTML = `
    <div class="modal modal--center" role="dialog" aria-modal="true" aria-label="دخول لوحة الإدارة">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">دخول قافل</h3>
      </div>
      <div class="modal__body">
        <p class="input-hint" id="admin-gate-msg">
          ${signedIn
? `أنت داخل باسم ${name}، لكن الحساب دا ما عنده صلاحية إدارة. لو المفروض عنده، اطلب من المالك يمنحه الصلاحية ثم اضغط "تحديث الصلاحيات".`
: 'لوحة الإدارة مفتوحة لحسابات جوجل المصرّح لها بس. سجّل دخولك بحسابك.'}
        </p>
        <p class="input-error-msg hidden" id="admin-gate-error">الحساب دا ما عنده صلاحية إدارة</p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-gate-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-gate-submit">${signedIn ? 'تحديث الصلاحيات' : 'دخول بحساب جوجل'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
const submitBtn = backdrop.querySelector('#admin-gate-submit');
const errorEl   = backdrop.querySelector('#admin-gate-error');
const close = () => closeAdminGate();
const submit = async () => {
submitBtn.disabled = true;
errorEl.classList.add('hidden');
try {
const current = getCurrentUser();
const u = (!current || current.isAnonymous)
? await signInWithGoogle()
: await refreshClaims();
if (!u) return;
const role = await enterAdminWithClaims();
if (role) {
close();
onSuccess?.(role);
return;
}
errorEl.classList.remove('hidden');
submitBtn.textContent = 'تحديث الصلاحيات';
} finally {
submitBtn.disabled = false;
}
};
backdrop.querySelector('#admin-gate-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', submit);
_cleanup = () => backdrop.remove();
}
export function closeAdminGate() {
if (_cleanup) {
_cleanup();
_cleanup = null;
}
}
