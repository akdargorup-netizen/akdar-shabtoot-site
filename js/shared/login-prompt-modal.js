import { signInWithGoogle, preloadGoogleSignIn } from '../data/auth.js';
import { renderIcons } from './icons.js';
let _cleanup = null;
export function openLoginPrompt() {
preloadGoogleSignIn();
return new Promise(resolve => {
closeLoginPrompt();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop overlay-backdrop--center';
backdrop.innerHTML = `
      <div class="modal modal--center login-prompt-modal" role="dialog" aria-modal="true" aria-label="تسجيل الدخول">
        <div class="modal__handle"></div>
        <div class="modal__body login-prompt-modal__body">
          <div class="login-prompt-modal__icon"><i data-lucide="user-round"></i></div>
          <h3 class="modal__title login-prompt-modal__title">داير تسجّل دخولك؟</h3>
          <p class="login-prompt-modal__desc">
            تسجيل الدخول يتيح لك التصويت وإضافة الأفكار والمشاركة في مناسبات البلد باسمك.
          </p>
        </div>
        <div class="modal__footer">
          <button class="btn btn--primary btn--full" id="login-prompt-yes">سجل هسي</button>
          <button class="btn btn--ghost btn--full" id="login-prompt-later">بعدين بسجل</button>
        </div>
      </div>
    `;
document.body.appendChild(backdrop);
renderIcons(backdrop);
let settled = false;
const finish = (result) => {
if (settled) return;
settled = true;
closeLoginPrompt();
resolve(result);
};
const yesBtn   = backdrop.querySelector('#login-prompt-yes');
const laterBtn = backdrop.querySelector('#login-prompt-later');
yesBtn.addEventListener('click', async () => {
yesBtn.disabled = true;
yesBtn.textContent = 'بنسجّلك…';
try {
const user = await signInWithGoogle();
finish(!!user);
} catch {
yesBtn.disabled = false;
yesBtn.textContent = 'سجل هسي';
}
});
laterBtn.addEventListener('click', () => finish(false));
backdrop.addEventListener('click', e => { if (e.target === backdrop) finish(false); });
_cleanup = () => backdrop.remove();
});
}
export function closeLoginPrompt() {
if (_cleanup) {
_cleanup();
_cleanup = null;
}
}
